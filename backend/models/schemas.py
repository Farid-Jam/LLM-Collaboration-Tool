from datetime import datetime
from typing import Literal
from pydantic import BaseModel, model_validator


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AccountOut(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AccountOut


# ---------------------------------------------------------------------------
# Room schemas
# ---------------------------------------------------------------------------

class RoomCreateRequest(BaseModel):
    name: str


class RoomOut(BaseModel):
    id: str
    name: str
    created_by: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RoomWithMemberCount(RoomOut):
    member_count: int


# ---------------------------------------------------------------------------
# Invite schemas
# ---------------------------------------------------------------------------

class InviteCreateResponse(BaseModel):
    token: str
    invite_url: str
    expires_at: datetime


class InvitePreviewResponse(BaseModel):
    room_id: str
    room_name: str
    expires_at: datetime
    is_expired: bool


class InviteAcceptResponse(BaseModel):
    room_id: str
    room_name: str


class UserOut(BaseModel):
    id: str
    display_name: str
    room_id: str
    connected_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: str
    room_id: str
    branch_id: str | None
    user_id: str
    role: str
    content: str
    image_url: str | None = None
    timestamp: datetime
    parent_message_id: str | None = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def derive_image_role(self) -> "MessageOut":
        if self.image_url is not None:
            self.role = "image"
        return self


class BranchOut(BaseModel):
    id: str
    room_id: str
    name: str
    forked_from_message_id: str
    created_by: str
    status: Literal["active", "merged", "discarded"]
    created_at: datetime

    model_config = {"from_attributes": True}


class QueueItemOut(BaseModel):
    id: str
    room_id: str
    user_id: str
    content: str
    status: Literal["pending", "approved", "discarded", "edited"]
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: str
    room_id: str
    filename: str
    uploaded_by: str
    chunk_count: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# Inbound WebSocket payload shapes
class UserJoinPayload(BaseModel):
    room_id: str
    display_name: str


class MessageSendPayload(BaseModel):
    room_id: str
    branch_id: str | None = None
    content: str


class QueueActionPayload(BaseModel):
    room_id: str
    queue_item_id: str
    new_content: str | None = None


class BranchCreatePayload(BaseModel):
    room_id: str
    fork_from_message_id: str
    name: str


class BranchMergePayload(BaseModel):
    room_id: str
    branch_id: str


class WebSocketEvent(BaseModel):
    event: str
    data: dict
    room_id: str
    user_id: str
