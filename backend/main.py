import asyncio
import io
import re
import secrets
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import socketio
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

_IMAGES_DIR = Path(__file__).parent / "static" / "images"
_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

from core.auth import (
    create_access_token, get_current_account, get_current_account_from_token,
    hash_password, verify_password,
)
from core.config import settings
from core.events import USER_JOIN, USER_JOINED, USER_LEFT, MESSAGE_SEND, LLM_STATUS
from models.database import (
    AsyncSessionLocal, AuthAccount, Room, RoomMembership, RoomInvite,
    User, Message, QueueItem, Document, Branch, get_session, init_db,
)
from models.schemas import (
    AccountOut, LoginRequest, LoginResponse, RegisterRequest,
    RoomCreateRequest, RoomWithMemberCount,
    InviteCreateResponse, InvitePreviewResponse, InviteAcceptResponse,
    MessageOut, QueueItemOut, DocumentOut, BranchOut,
    UserJoinPayload, MessageSendPayload, QueueActionPayload,
    BranchCreatePayload, BranchMergePayload,
)
from services.rag import rag_service
from services.llm import llm_service
from services.queue import queue_manager

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

app = FastAPI(title="Collaborate API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# sid → {user_id, room_id, display_name}
_sessions: dict[str, dict] = {}

# room_id → {branch_id, summary} awaiting group merge approval
_pending_merges: dict[str, dict] = {}

# sid → account_id (populated on WebSocket connect, cleared on disconnect)
_auth_cache: dict[str, str] = {}


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.post("/auth/register", response_model=AccountOut, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_session)) -> dict:
    existing = await db.execute(
        select(AuthAccount).where(
            (AuthAccount.email == payload.email) | (AuthAccount.username == payload.username)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already taken")

    account = AuthAccount(
        id=str(uuid.uuid4()),
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        created_at=datetime.utcnow(),
    )
    db.add(account)
    await db.commit()
    return AccountOut.model_validate(account).model_dump(mode="json")


@app.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_session)) -> dict:
    result = await db.execute(select(AuthAccount).where(AuthAccount.email == payload.email))
    account = result.scalar_one_or_none()
    if not account or not verify_password(payload.password, account.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(account.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": AccountOut.model_validate(account).model_dump(mode="json"),
    }


@app.get("/auth/me", response_model=AccountOut)
async def me(account: AuthAccount = Depends(get_current_account)) -> dict:
    return AccountOut.model_validate(account).model_dump(mode="json")


# ---------------------------------------------------------------------------
# Room endpoints
# ---------------------------------------------------------------------------

@app.post("/rooms", response_model=RoomWithMemberCount, status_code=201)
async def create_room(
    payload: RoomCreateRequest,
    account: AuthAccount = Depends(get_current_account),
    db: AsyncSession = Depends(get_session),
) -> dict:
    room = Room(
        id=str(uuid.uuid4()),
        name=payload.name,
        created_by=account.id,
        created_at=datetime.utcnow(),
    )
    db.add(room)
    membership = RoomMembership(
        id=str(uuid.uuid4()),
        room_id=room.id,
        account_id=account.id,
        role="owner",
        joined_at=datetime.utcnow(),
    )
    db.add(membership)
    await db.commit()
    return {"id": room.id, "name": room.name, "created_by": room.created_by, "created_at": room.created_at, "member_count": 1}


@app.get("/rooms", response_model=list[RoomWithMemberCount])
async def list_rooms(
    account: AuthAccount = Depends(get_current_account),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    result = await db.execute(
        select(Room, func.count(RoomMembership.id).label("member_count"))
        .join(RoomMembership, Room.id == RoomMembership.room_id)
        .where(RoomMembership.account_id == account.id)
        .group_by(Room.id)
        .order_by(Room.created_at.desc())
    )
    return [
        {"id": r.id, "name": r.name, "created_by": r.created_by, "created_at": r.created_at, "member_count": count}
        for r, count in result.all()
    ]


@app.get("/rooms/{room_id}", response_model=RoomWithMemberCount)
async def get_room(
    room_id: str,
    account: AuthAccount = Depends(get_current_account),
    db: AsyncSession = Depends(get_session),
) -> dict:
    membership = await db.execute(
        select(RoomMembership).where(
            RoomMembership.room_id == room_id,
            RoomMembership.account_id == account.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this room")

    result = await db.execute(
        select(Room, func.count(RoomMembership.id).label("member_count"))
        .join(RoomMembership, Room.id == RoomMembership.room_id)
        .where(Room.id == room_id)
        .group_by(Room.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Room not found")
    room, count = row
    return {"id": room.id, "name": room.name, "created_by": room.created_by, "created_at": room.created_at, "member_count": count}


@app.delete("/rooms/{room_id}", status_code=204)
async def delete_room(
    room_id: str,
    account: AuthAccount = Depends(get_current_account),
    db: AsyncSession = Depends(get_session),
) -> None:
    membership = (await db.execute(
        select(RoomMembership).where(
            RoomMembership.room_id == room_id,
            RoomMembership.account_id == account.id,
            RoomMembership.role == "owner",
        )
    )).scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=403, detail="Only the room owner can delete this room")
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    await db.delete(room)
    await db.commit()


# ---------------------------------------------------------------------------
# Invite endpoints
# ---------------------------------------------------------------------------

@app.post("/rooms/{room_id}/invites", response_model=InviteCreateResponse, status_code=201)
async def create_invite(
    room_id: str,
    account: AuthAccount = Depends(get_current_account),
    db: AsyncSession = Depends(get_session),
) -> dict:
    membership = await db.execute(
        select(RoomMembership).where(
            RoomMembership.room_id == room_id,
            RoomMembership.account_id == account.id,
            RoomMembership.role == "owner",
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only room owners can create invite links")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)
    invite = RoomInvite(
        id=str(uuid.uuid4()),
        room_id=room_id,
        created_by=account.id,
        token=token,
        expires_at=expires_at,
        created_at=datetime.utcnow(),
    )
    db.add(invite)
    await db.commit()

    invite_url = f"{settings.frontend_url}/invite/{token}"
    return {"token": token, "invite_url": invite_url, "expires_at": expires_at}


@app.get("/invites/{token}", response_model=InvitePreviewResponse)
async def preview_invite(token: str, db: AsyncSession = Depends(get_session)) -> dict:
    result = await db.execute(
        select(RoomInvite).where(RoomInvite.token == token)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    room = await db.get(Room, invite.room_id)
    return {
        "room_id": invite.room_id,
        "room_name": room.name if room else invite.room_id,
        "expires_at": invite.expires_at,
        "is_expired": invite.expires_at < datetime.utcnow(),
    }


@app.post("/invites/{token}/accept", response_model=InviteAcceptResponse)
async def accept_invite(
    token: str,
    account: AuthAccount = Depends(get_current_account),
    db: AsyncSession = Depends(get_session),
) -> dict:
    result = await db.execute(
        select(RoomInvite).where(RoomInvite.token == token)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Invite has expired")

    # Upsert membership — idempotent
    existing = await db.execute(
        select(RoomMembership).where(
            RoomMembership.room_id == invite.room_id,
            RoomMembership.account_id == account.id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(RoomMembership(
            id=str(uuid.uuid4()),
            room_id=invite.room_id,
            account_id=account.id,
            role="member",
            joined_at=datetime.utcnow(),
        ))
        await db.commit()

    room = await db.get(Room, invite.room_id)
    return {
        "room_id": invite.room_id,
        "room_name": room.name if room else invite.room_id,
    }


# ---------------------------------------------------------------------------
# Document REST endpoints
# ---------------------------------------------------------------------------

async def _require_member(room_id: str, account: AuthAccount, db: AsyncSession) -> None:
    result = await db.execute(
        select(RoomMembership).where(
            RoomMembership.room_id == room_id,
            RoomMembership.account_id == account.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this room")


@app.post("/rooms/{room_id}/documents", response_model=DocumentOut)
async def upload_document(
    room_id: str,
    file: UploadFile = File(...),
    user_id: str = Query(...),
    account: AuthAccount = Depends(get_current_account),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await _require_member(room_id, account, db)
    pdf_bytes = await file.read()
    reader = PdfReader(io.BytesIO(pdf_bytes))
    full_text = "\n\n".join(
        page.extract_text() or "" for page in reader.pages
    ).strip()

    chunks = rag_service.split_text(full_text)

    doc = Document(
        id=str(uuid.uuid4()),
        room_id=room_id,
        filename=file.filename or "document.pdf",
        uploaded_by=user_id,
        chunk_count=len(chunks),
        uploaded_at=datetime.utcnow(),
    )
    db.add(doc)
    await db.commit()

    await rag_service.index_document_chunks(chunks, room_id, doc.id)

    doc_data = DocumentOut.model_validate(doc).model_dump(mode="json")
    await sio.emit("document:uploaded", doc_data, room=room_id)

    return doc_data


@app.get("/rooms/{room_id}/documents", response_model=list[DocumentOut])
async def list_documents(
    room_id: str,
    account: AuthAccount = Depends(get_current_account),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    await _require_member(room_id, account, db)
    result = await db.execute(
        select(Document)
        .where(Document.room_id == room_id)
        .order_by(Document.uploaded_at)
    )
    docs = result.scalars().all()
    return [DocumentOut.model_validate(d).model_dump(mode="json") for d in docs]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _count_pending(room_id: str) -> int:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(func.count()).select_from(QueueItem).where(
                QueueItem.room_id == room_id,
                QueueItem.status == "pending",
            )
        )
        return result.scalar_one()


async def _get_recent_history(
    room_id: str,
    branch_id: str | None,
    limit: int = 10,
) -> list[dict[str, str]]:
    branch_filter = (
        Message.branch_id.is_(None) if branch_id is None
        else Message.branch_id == branch_id
    )
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Message)
            .where(Message.room_id == room_id, branch_filter)
            .order_by(Message.timestamp.desc())
            .limit(limit)
        )
        msgs = list(reversed(result.scalars().all()))
    return [{"role": m.role, "content": m.content} for m in msgs]


_IMAGE_TAG_RE = re.compile(r'\[GENERATE_IMAGE:\s*(.*?)\]', re.DOTALL)
_IMAGE_REQUEST_RE = re.compile(
    r'\b(generate|create|make|draw|show|render|produce|paint|design|visualize|imagine)\b.{0,60}'
    r'\b(image|picture|photo|illustration|concept art|mood board|logo|mockup|sketch)\b',
    re.IGNORECASE,
)


def _sync_generate_image(prompt: str):
    """Synchronous HuggingFace call — runs in a thread pool executor."""
    from huggingface_hub import InferenceClient
    client = InferenceClient(token=settings.hf_token)
    return client.text_to_image(prompt, model="stabilityai/stable-diffusion-xl-base-1.0")


async def _generate_and_save_image(description: str) -> str:
    """Generate one image, save it, return the markdown image snippet."""
    loop = asyncio.get_event_loop()
    image = await asyncio.wait_for(
        loop.run_in_executor(None, _sync_generate_image, description),
        timeout=90,
    )
    image_id = str(uuid.uuid4())
    image_path = _IMAGES_DIR / f"{image_id}.png"
    image.save(image_path)
    url = f"{settings.backend_url}/static/images/{image_id}.png"
    return f"![{description}]({url})"


async def _run_pipeline(
    room_id: str,
    branch_id: str | None,
    content: str,
    user_id: str,
) -> None:
    """RAG retrieval + LLM streaming. Room must already be marked busy."""
    await sio.emit(LLM_STATUS, {"status": "generating"}, room=room_id)

    history = await _get_recent_history(room_id, branch_id)
    messages = await rag_service.get_prompt_messages(content, room_id, history)

    async with AsyncSessionLocal() as db:
        asst_msg = Message(
            id=str(uuid.uuid4()),
            room_id=room_id,
            branch_id=branch_id,
            user_id=user_id,
            role="assistant",
            content="",
            timestamp=datetime.utcnow(),
        )
        db.add(asst_msg)
        await db.commit()

    await sio.emit(
        "message:new",
        {**MessageOut.model_validate(asst_msg).model_dump(mode="json"), "display_name": "Assistant"},
        room=room_id,
    )

    full_content = ""
    async for token in llm_service.stream(messages):
        full_content += token
        await sio.emit("message:stream", {"message_id": asst_msg.id, "token": token}, room=room_id)

    await sio.emit("message:complete", {"message_id": asst_msg.id}, room=room_id)

    # If user explicitly requested an image but LLM didn't include a tag, inject one
    if not _IMAGE_TAG_RE.search(full_content) and _IMAGE_REQUEST_RE.search(content):
        full_content = full_content.rstrip() + f"\n\n[GENERATE_IMAGE: {content}]"

    # Replace any [GENERATE_IMAGE: ...] tags with actual images
    tags = _IMAGE_TAG_RE.findall(full_content)
    if tags:
        results = await asyncio.gather(
            *[_generate_and_save_image(desc.strip()) for desc in tags],
            return_exceptions=True,
        )
        for tag_text, result in zip(tags, results):
            if not isinstance(result, str):
                print(f"[image] generation failed: {result!r}")
            replacement = result if isinstance(result, str) else f"*(image generation failed)*"
            full_content = full_content.replace(f"[GENERATE_IMAGE: {tag_text}]", replacement, 1)

        await sio.emit("message:update", {"message_id": asst_msg.id, "content": full_content}, room=room_id)

    async with AsyncSessionLocal() as db:
        stored = await db.get(Message, asst_msg.id)
        if stored:
            stored.content = full_content
            await db.commit()


async def _save_and_run_pipeline(
    room_id: str,
    branch_id: str | None,
    content: str,
    user_id: str,
    display_name: str,
) -> None:
    async with AsyncSessionLocal() as db:
        user_msg = Message(
            id=str(uuid.uuid4()),
            room_id=room_id,
            branch_id=branch_id,
            user_id=user_id,
            role="user",
            content=content,
            timestamp=datetime.utcnow(),
        )
        db.add(user_msg)
        await db.commit()

    await sio.emit(
        "message:new",
        {**MessageOut.model_validate(user_msg).model_dump(mode="json"), "display_name": display_name},
        room=room_id,
    )

    await _run_pipeline(room_id, branch_id, content, user_id)
    await _process_queue_or_idle(room_id)


async def _process_queue_or_idle(room_id: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(QueueItem)
            .where(QueueItem.room_id == room_id, QueueItem.status == "pending")
            .order_by(QueueItem.created_at)
            .limit(1)
        )
        next_item = result.scalar_one_or_none()

    if next_item:
        n = await _count_pending(room_id)
        await sio.emit(LLM_STATUS, {"status": f"queued({n})"}, room=room_id)
        await sio.emit(
            "queue:review",
            QueueItemOut.model_validate(next_item).model_dump(mode="json"),
            room=room_id,
        )
    else:
        queue_manager.set_idle(room_id)
        await sio.emit(LLM_STATUS, {"status": "idle"}, room=room_id)


# ---------------------------------------------------------------------------
# Socket.IO event handlers
# ---------------------------------------------------------------------------

@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None) -> None:
    token = (auth or {}).get("token")
    if not token:
        raise ConnectionRefusedError("authentication required")
    account = await get_current_account_from_token(token)
    if not account:
        raise ConnectionRefusedError("invalid or expired token")
    _auth_cache[sid] = account.id


@sio.event
async def disconnect(sid: str) -> None:
    _auth_cache.pop(sid, None)
    session = _sessions.pop(sid, None)
    if session:
        await sio.leave_room(sid, session["room_id"])
        await sio.emit(USER_LEFT, {"user_id": session["user_id"]}, room=session["room_id"])


@sio.on(USER_JOIN)
async def handle_user_join(sid: str, data: dict) -> None:
    account_id = _auth_cache.get(sid)
    if not account_id:
        await sio.emit("error", {"message": "Not authenticated"}, to=sid)
        return

    payload = UserJoinPayload(**data)

    async with AsyncSessionLocal() as db:
        # Verify membership
        membership = await db.execute(
            select(RoomMembership).where(
                RoomMembership.room_id == payload.room_id,
                RoomMembership.account_id == account_id,
            )
        )
        if not membership.scalar_one_or_none():
            await sio.emit("error", {"message": "Not a member of this room"}, to=sid)
            return

        room = await db.get(Room, payload.room_id)
        if not room:
            room = Room(id=payload.room_id, name=payload.room_id)
            db.add(room)

        user = User(
            id=str(uuid.uuid4()),
            room_id=payload.room_id,
            display_name=payload.display_name,
            account_id=account_id,
        )
        db.add(user)
        await db.commit()

        result = await db.execute(
            select(Message, User.display_name)
            .join(User, Message.user_id == User.id)
            .where(Message.room_id == payload.room_id)
            .order_by(Message.timestamp)
            .limit(300)
        )
        history = [
            {**MessageOut.model_validate(msg).model_dump(mode="json"), "display_name": dname}
            for msg, dname in result.all()
        ]

        branches_result = await db.execute(
            select(Branch)
            .where(Branch.room_id == payload.room_id, Branch.status == "active")
            .order_by(Branch.created_at)
        )
        branches = branches_result.scalars().all()

    _sessions[sid] = {
        "user_id": user.id,
        "room_id": payload.room_id,
        "display_name": payload.display_name,
    }

    await sio.enter_room(sid, payload.room_id)
    await sio.emit("user:self", {"user_id": user.id, "display_name": payload.display_name}, to=sid)

    current_users = [
        {"user_id": s["user_id"], "display_name": s["display_name"]}
        for s in _sessions.values()
        if s["room_id"] == payload.room_id
    ]
    await sio.emit("room:users", {"users": current_users}, to=sid)
    await sio.emit(USER_JOINED, {"user_id": user.id, "display_name": payload.display_name}, room=payload.room_id)
    await sio.emit("room:history", {"messages": history}, to=sid)
    await sio.emit(
        "room:branches",
        {"branches": [BranchOut.model_validate(b).model_dump(mode="json") for b in branches]},
        to=sid,
    )

    if queue_manager.is_busy(payload.room_id):
        n = await _count_pending(payload.room_id)
        status = f"queued({n})" if n > 0 else "generating"
    else:
        status = "idle"
    await sio.emit(LLM_STATUS, {"status": status}, to=sid)


@sio.on(MESSAGE_SEND)
async def handle_message_send(sid: str, data: dict) -> None:
    session = _sessions.get(sid)
    if not session:
        return

    payload = MessageSendPayload(**data)
    room_id = payload.room_id

    async with queue_manager.get_lock(room_id):
        if queue_manager.is_busy(room_id):
            async with AsyncSessionLocal() as db:
                item = QueueItem(
                    id=str(uuid.uuid4()),
                    room_id=room_id,
                    user_id=session["user_id"],
                    content=payload.content,
                    status="pending",
                    created_at=datetime.utcnow(),
                )
                db.add(item)
                await db.commit()

            n = await _count_pending(room_id)
            await sio.emit(LLM_STATUS, {"status": f"queued({n})"}, room=room_id)
            await sio.emit(
                "queue:added",
                QueueItemOut.model_validate(item).model_dump(mode="json"),
                room=room_id,
            )
            return

        queue_manager.set_busy(room_id)

    asyncio.create_task(_save_and_run_pipeline(
        room_id=room_id,
        branch_id=payload.branch_id,
        content=payload.content,
        user_id=session["user_id"],
        display_name=session["display_name"],
    ))


@sio.on("queue:approve")
async def handle_queue_approve(sid: str, data: dict) -> None:
    payload = QueueActionPayload(**data)
    room_id = payload.room_id

    async with queue_manager.get_lock(room_id):
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(QueueItem).where(
                    QueueItem.id == payload.queue_item_id,
                    QueueItem.status == "pending",
                )
            )
            item = result.scalar_one_or_none()
            if not item:
                return
            item.status = "approved"
            await db.commit()
            user = await db.get(User, item.user_id)
            display_name = user.display_name if user else "Unknown"

    await sio.emit("queue:resolved", {"queue_item_id": item.id, "action": "approved"}, room=room_id)
    asyncio.create_task(_save_and_run_pipeline(
        room_id=room_id, branch_id=None,
        content=item.content, user_id=item.user_id, display_name=display_name,
    ))


@sio.on("queue:edit")
async def handle_queue_edit(sid: str, data: dict) -> None:
    payload = QueueActionPayload(**data)
    room_id = payload.room_id

    async with queue_manager.get_lock(room_id):
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(QueueItem).where(
                    QueueItem.id == payload.queue_item_id,
                    QueueItem.status == "pending",
                )
            )
            item = result.scalar_one_or_none()
            if not item:
                return
            item.status = "edited"
            item.content = payload.new_content or item.content
            await db.commit()
            user = await db.get(User, item.user_id)
            display_name = user.display_name if user else "Unknown"

    await sio.emit("queue:resolved", {"queue_item_id": item.id, "action": "edited"}, room=room_id)
    asyncio.create_task(_save_and_run_pipeline(
        room_id=room_id, branch_id=None,
        content=item.content, user_id=item.user_id, display_name=display_name,
    ))


@sio.on("queue:discard")
async def handle_queue_discard(sid: str, data: dict) -> None:
    payload = QueueActionPayload(**data)
    room_id = payload.room_id

    async with queue_manager.get_lock(room_id):
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(QueueItem).where(
                    QueueItem.id == payload.queue_item_id,
                    QueueItem.status == "pending",
                )
            )
            item = result.scalar_one_or_none()
            if not item:
                return
            item.status = "discarded"
            await db.commit()

    await sio.emit("queue:resolved", {"queue_item_id": item.id, "action": "discarded"}, room=room_id)
    asyncio.create_task(_process_queue_or_idle(room_id))


# ---------------------------------------------------------------------------
# Branch / merge handlers
# ---------------------------------------------------------------------------

@sio.on("branch:create")
async def handle_branch_create(sid: str, data: dict) -> None:
    session = _sessions.get(sid)
    if not session:
        return

    payload = BranchCreatePayload(**data)

    async with AsyncSessionLocal() as db:
        branch = Branch(
            id=str(uuid.uuid4()),
            room_id=payload.room_id,
            name=payload.name,
            forked_from_message_id=payload.fork_from_message_id,
            created_by=session["user_id"],
            status="active",
            created_at=datetime.utcnow(),
        )
        db.add(branch)
        await db.commit()

    branch_data = BranchOut.model_validate(branch).model_dump(mode="json")
    await sio.emit("branch:created", branch_data, room=payload.room_id)


@sio.on("branch:merge")
async def handle_branch_merge(sid: str, data: dict) -> None:
    payload = BranchMergePayload(**data)
    room_id = payload.room_id
    branch_id = payload.branch_id

    async with AsyncSessionLocal() as db:
        branch = await db.get(Branch, branch_id)
        if not branch or branch.status != "active":
            return

        result = await db.execute(
            select(Message)
            .where(Message.room_id == room_id, Message.branch_id == branch_id)
            .order_by(Message.timestamp)
        )
        branch_msgs = result.scalars().all()

    if not branch_msgs:
        return

    summary_prompt = [
        {
            "role": "system",
            "content": (
                "Summarize the following conversation branch concisely for merging back "
                "into the main conversation. Capture key decisions, insights, and conclusions."
            ),
        },
        {
            "role": "user",
            "content": "\n".join(
                f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
                for m in branch_msgs
            ),
        },
    ]

    summary = ""
    async for token in llm_service.stream(summary_prompt):
        summary += token

    _pending_merges[room_id] = {"branch_id": branch_id, "branch_name": branch.name, "summary": summary}
    await sio.emit(
        "merge:review",
        {"branch_id": branch_id, "branch_name": branch.name, "summary": summary},
        room=room_id,
    )


@sio.on("merge:approve")
async def handle_merge_approve(sid: str, data: dict) -> None:
    room_id = data["room_id"]
    branch_id = data["branch_id"]

    pending = _pending_merges.pop(room_id, None)
    if not pending or pending["branch_id"] != branch_id:
        return

    session = _sessions.get(sid)
    if not session:
        return

    async with AsyncSessionLocal() as db:
        branch = await db.get(Branch, branch_id)
        if not branch or branch.status != "active":
            return
        branch.status = "merged"

        merge_msg = Message(
            id=str(uuid.uuid4()),
            room_id=room_id,
            branch_id=None,
            user_id=session["user_id"],
            role="assistant",
            content=f"**Branch merged: {pending['branch_name']}**\n\n{pending['summary']}",
            timestamp=datetime.utcnow(),
        )
        db.add(merge_msg)
        await db.commit()

    msg_data = {**MessageOut.model_validate(merge_msg).model_dump(mode="json"), "display_name": "Assistant"}
    await sio.emit("message:new", msg_data, room=room_id)
    await sio.emit(
        "branch:merged",
        {"branch_id": branch_id, "summary_message": msg_data},
        room=room_id,
    )


@sio.on("merge:reject")
async def handle_merge_reject(sid: str, data: dict) -> None:
    room_id = data["room_id"]
    branch_id = data["branch_id"]
    _pending_merges.pop(room_id, None)
    await sio.emit("merge:rejected", {"branch_id": branch_id}, room=room_id)

if __name__ == "__main__":
    import uvicorn, os
    uvicorn.run(socket_app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
