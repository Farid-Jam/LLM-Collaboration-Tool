from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class RoomOut(BaseModel):
    id: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


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
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime
    parent_message_id: str | None

    model_config = {"from_attributes": True}


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
