"""
Memory store for AYRA conversations.

This module appends chat entries to a JSON file in the backend/MEMORY
folder. Each saved entry preserves the conversation timestamp, the user's
message, and AYRA's response.
"""

import json
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_RECENT_CHAT_LIMIT = 3

ERROR_PATTERNS = [
    "something went wrong",
    "couldn't generate a response",
    "could not connect",
    "brain lag",
    "crashed",
    "sleeping right now",
    "error",
]


class Memory:
    """Simple JSON-backed chat memory persistence."""

    def is_error_response(self, text):
        """Check whether a response string is an error or fallback."""
        if not text or not isinstance(text, str):
            return True
        lower = text.lower()
        return any(p in lower for p in ERROR_PATTERNS)

    def recent_chats(self, limit=DEFAULT_RECENT_CHAT_LIMIT):
        """Return the most recent valid conversations in chronological order."""
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

        # Filter backwards to only collect legitimate, non-error chat turns
        valid = []
        for chat in reversed(data):
            if isinstance(chat, dict):
                ayra_text = str(chat.get("ayra", "")).strip()
                user_text = str(chat.get("user", "")).strip()
                if ayra_text and user_text and not self.is_error_response(ayra_text):
                    valid.append(self._clean_chat(chat))
                    if len(valid) >= limit:
                        break

        valid.reverse()
        return valid

    def recent_context(self, limit=DEFAULT_RECENT_CHAT_LIMIT):
        """Return recent chats formatted for the brain prompt."""
        return self.recent_chats(limit=limit)

    def _clean_chat(self, chat):
        """Keep only fields needed for short-term conversation memory."""
        user_text = str(chat.get("user", "")).strip()
        ayra_text = str(chat.get("ayra", "")).strip()
        ayra_text = re.sub(
            r"^(?:(?:ayra|aira|assistant)\s*:\s*)+",
            "",
            ayra_text,
            flags=re.IGNORECASE
        ).strip()
        return {
            "user": user_text,
            "ayra": ayra_text
        }

    def memory(self, chat):
        """Append a chat dictionary to the history.json file if it's not an error.

        Args:
            chat (dict): Chat data with keys such as date, time, user, ayra.
        """
        ayra_text = str(chat.get("ayra", "")).strip()
        if not ayra_text or self.is_error_response(ayra_text):
            print("Skipping memory write for error/fallback message.")
            return

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
