from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Integer, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
import uuid

from core.config import settings


def _uuid() -> str:
    return str(uuid.uuid4())


engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Room(Base):
    __tablename__ = "rooms"

    id: str = Column(String, primary_key=True, default=_uuid)
    name: str = Column(String, nullable=False)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")
    branches = relationship("Branch", back_populates="room", cascade="all, delete-orphan")
    queue_items = relationship("QueueItem", back_populates="room", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: str = Column(String, primary_key=True, default=_uuid)
    display_name: str = Column(String, nullable=False)
    room_id: str = Column(String, ForeignKey("rooms.id"), nullable=False)
    connected_at: datetime = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="users")
    messages = relationship("Message", back_populates="user")
    queue_items = relationship("QueueItem", back_populates="user")


class Message(Base):
    __tablename__ = "messages"

    id: str = Column(String, primary_key=True, default=_uuid)
    room_id: str = Column(String, ForeignKey("rooms.id"), nullable=False)
    branch_id: str | None = Column(String, ForeignKey("branches.id"), nullable=True)
    user_id: str = Column(String, ForeignKey("users.id"), nullable=False)
    role: str = Column(SAEnum("user", "assistant", name="message_role"), nullable=False)
    content: str = Column(Text, nullable=False)
    timestamp: datetime = Column(DateTime, default=datetime.utcnow)
    parent_message_id: str | None = Column(String, ForeignKey("messages.id"), nullable=True)

    room = relationship("Room", back_populates="messages")
    user = relationship("User", back_populates="messages")
    branch = relationship("Branch", back_populates="messages", foreign_keys="[Message.branch_id]")


class Branch(Base):
    __tablename__ = "branches"

    id: str = Column(String, primary_key=True, default=_uuid)
    room_id: str = Column(String, ForeignKey("rooms.id"), nullable=False)
    name: str = Column(String, nullable=False)
    forked_from_message_id: str = Column(String, ForeignKey("messages.id"), nullable=False)
    created_by: str = Column(String, ForeignKey("users.id"), nullable=False)
    status: str = Column(
        SAEnum("active", "merged", "discarded", name="branch_status"),
        default="active",
        nullable=False,
    )
    created_at: datetime = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="branches")
    messages = relationship("Message", back_populates="branch", foreign_keys="[Message.branch_id]")


class QueueItem(Base):
    __tablename__ = "queue_items"

    id: str = Column(String, primary_key=True, default=_uuid)
    room_id: str = Column(String, ForeignKey("rooms.id"), nullable=False)
    user_id: str = Column(String, ForeignKey("users.id"), nullable=False)
    content: str = Column(Text, nullable=False)
    status: str = Column(
        SAEnum("pending", "approved", "discarded", "edited", name="queue_status"),
        default="pending",
        nullable=False,
    )
    created_at: datetime = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="queue_items")
    user = relationship("User", back_populates="queue_items")


class Document(Base):
    __tablename__ = "documents"

    id: str = Column(String, primary_key=True, default=_uuid)
    room_id: str = Column(String, ForeignKey("rooms.id"), nullable=False)
    filename: str = Column(String, nullable=False)
    uploaded_by: str = Column(String, ForeignKey("users.id"), nullable=False)
    chunk_count: int = Column(Integer, default=0)
    uploaded_at: datetime = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room")


async def init_db() -> None:
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
