"""Recent conversation context backed by ``backend/MEMORY/history.json``."""

import json
import logging
import re
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("aira.memory")

HISTORY_FILE = Path(__file__).resolve().parents[1] / "MEMORY" / "history.json"
RECENT_CHAT_LIMIT = 3
ERROR_PATTERNS = (
    "something went wrong",
    "couldn't generate a response",
    "could not connect",
    "brain lag",
    "crashed",
    "sleeping right now",
    "error",
)


class AiraMemorySystem:
    """Read and append chat history, using only the latest three valid chats as context."""

    _instance: Optional["AiraMemorySystem"] = None
    _instance_lock = threading.Lock()

    def __new__(cls, history_path: Optional[Any] = None):
        if history_path is not None:
            return super().__new__(cls)
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
            return cls._instance

    def __init__(self, history_path: Optional[Any] = None):
        if getattr(self, "_initialized", False) and history_path is None:
            return
        self.history_file = Path(history_path) if history_path else HISTORY_FILE
        self._lock = threading.RLock()
        self._initialized = True

    @staticmethod
    def _is_error_response(text: str) -> bool:
        lowered = text.lower()
        return any(pattern in lowered for pattern in ERROR_PATTERNS)

    def _read_history(self) -> Optional[List[Dict[str, Any]]]:
        try:
            with self.history_file.open("r", encoding="utf-8") as history_file:
                history = json.load(history_file)
        except FileNotFoundError:
            return []
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Could not read chat history at %s: %s", self.history_file, exc)
            return None
        if not isinstance(history, list):
            logger.warning("Chat history at %s is not a list.", self.history_file)
            return None
        return history

    def get_recent_chats(self, limit: int = RECENT_CHAT_LIMIT) -> List[Dict[str, str]]:
        """Return up to three valid user and assistant turns in chronological order."""
        try:
            limit = min(int(limit), RECENT_CHAT_LIMIT)
        except (TypeError, ValueError):
            limit = RECENT_CHAT_LIMIT
        if limit <= 0:
            return []

        with self._lock:
            history = self._read_history()
        if history is None:
            return []

        recent: List[Dict[str, str]] = []
        for chat in reversed(history):
            if not isinstance(chat, dict):
                continue
            user_text = str(chat.get("user", "")).strip()
            assistant_text = str(chat.get("ayra", "")).strip()
            if not user_text or not assistant_text or self._is_error_response(assistant_text):
                continue
            assistant_text = re.sub(
                r"^(?:(?:ayra|aira|assistant)\s*:\s*)+",
                "",
                assistant_text,
                flags=re.IGNORECASE,
            ).strip()
            recent.append({"user": user_text, "ayra": assistant_text})
            if len(recent) == limit:
                break
        recent.reverse()
        return recent

    def record_conversation_turn(self, user_text: str, assistant_text: str) -> None:
        """Append a completed chat to the existing history file."""
        user_text = (user_text or "").strip()
        assistant_text = (assistant_text or "").strip()
        if not user_text or not assistant_text:
            return

        with self._lock:
            history = self._read_history()
            if history is None:
                return
            history.append({
                "date": datetime.now().strftime("%d-%m-%Y %H:%M:%S"),
                "time": datetime.now().isoformat(),
                "user": user_text,
                "ayra": assistant_text,
            })
            history = history[-2000:]
            try:
                self.history_file.parent.mkdir(parents=True, exist_ok=True)
                with self.history_file.open("w", encoding="utf-8") as history_file:
                    json.dump(history, history_file, indent=4, ensure_ascii=False)
            except OSError as exc:
                logger.warning("Could not write chat history at %s: %s", self.history_file, exc)

    def build_system_memory_prompt(self, current_user_text: str = "") -> str:
        """Format the last three saved chats as continuity context for the model."""
        chats = self.get_recent_chats()
        if not chats:
            return ""

        lines = ["Recent conversation history (up to the last three chats):"]
        for chat in chats:
            lines.extend((f"User: {chat['user']}", f"Aira: {chat['ayra']}"))
        lines.append("Use this history only when it helps continue the conversation naturally.")
        return "\n[Recent Conversation Context]\n" + "\n".join(lines) + "\n"

    def get_recent_context(self, limit: int = RECENT_CHAT_LIMIT) -> List[Dict[str, str]]:
        """Compatibility alias for retrieving recent chats."""
        return self.get_recent_chats(limit)


_memory_instance: Optional[AiraMemorySystem] = None


def get_memory_system() -> AiraMemorySystem:
    """Return the shared history-backed context manager."""
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = AiraMemorySystem()
    return _memory_instance
