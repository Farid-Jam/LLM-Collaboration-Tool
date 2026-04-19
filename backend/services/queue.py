import asyncio


class QueueManager:
    """Tracks per-room LLM busy state with asyncio locks for safe concurrent access."""

    def __init__(self) -> None:
        self._busy: set[str] = set()
        self._locks: dict[str, asyncio.Lock] = {}

    def get_lock(self, room_id: str) -> asyncio.Lock:
        if room_id not in self._locks:
            self._locks[room_id] = asyncio.Lock()
        return self._locks[room_id]

    def is_busy(self, room_id: str) -> bool:
        return room_id in self._busy

    def set_busy(self, room_id: str) -> None:
        self._busy.add(room_id)

    def set_idle(self, room_id: str) -> None:
        self._busy.discard(room_id)


queue_manager = QueueManager()
