"""
Memory store for AYRA conversations.

This module appends chat entries to a JSON file in the backend/MEMORY
folder. Each saved entry preserves the conversation timestamp, the user's
message, and AYRA's response.
"""

import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_RECENT_CHAT_LIMIT = 4


class Memory:
    """Simple JSON-backed chat memory persistence."""

    def recent_chats(self, limit=DEFAULT_RECENT_CHAT_LIMIT):
        """Return the most recent saved conversations in chronological order."""
        file_path = BASE_DIR / "history.json"

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            return []

        try:
            limit = int(limit)
        except (TypeError, ValueError):
            limit = DEFAULT_RECENT_CHAT_LIMIT

        if not isinstance(data, list) or limit <= 0:
            return []

        recent = data[-limit:]

        return [
            self._clean_chat(chat)
            for chat in recent
            if isinstance(chat, dict)
        ]

    def recent_context(self, limit=DEFAULT_RECENT_CHAT_LIMIT):
        """Return recent chats formatted for the brain prompt."""
        return self.recent_chats(limit=limit)

    def _clean_chat(self, chat):
        """Keep only fields needed for short-term conversation memory."""
        return {
            "user": str(chat.get("user", "")).strip(),
            "ayra": str(chat.get("ayra", "")).strip()
        }

    def memory(self, chat):
        """Append a chat dictionary to the history.json file.

        Args:
            chat (dict): Chat data with keys such as date, time, user, ayra.
        """
        file_path = BASE_DIR / "history.json"

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = []

        data.append(chat)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        print("Memory updated!")
