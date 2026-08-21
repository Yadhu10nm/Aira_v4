"""
Memory store for AYRA conversations.

This module appends chat entries to a JSON file in the backend/MEMORY
folder. Each saved entry preserves the conversation timestamp, the user's
message, and AYRA's response.
"""

import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent


class Memory:
    """Simple JSON-backed chat memory persistence."""

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
