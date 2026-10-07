"""
Conversation Manager for AIRA AI Assistant.
    Maintains a bounded context window and injects the latest saved chats.
"""

import logging
from typing import List, Dict, Optional

from .config import MAX_HISTORY_MESSAGES
from .memory_system import get_memory_system
try:
    from ..BRAIN.prompts.system import SYSTEM_PROMPT
except ImportError:
    from BRAIN.prompts.system import SYSTEM_PROMPT

logger = logging.getLogger("aira.conversation")


class ConversationManager:
    """Manages chat message history, context pruning, and natural memory injection."""

    def __init__(self, max_messages: int = MAX_HISTORY_MESSAGES):
        self.max_messages = max(2, max_messages)
        self.messages: List[Dict[str, str]] = []
        self.memory_system = get_memory_system()

    def add_user_message(self, content: str):
        """Append user message to history, trigger memory learning, and prune if necessary."""
        text = (content or "").strip()
        if not text:
            return
        self.messages.append({"role": "user", "content": text})
        self._prune_history()

    def add_assistant_message(self, content: str):
        """Append assistant message to history, record turn to persistent memory, and prune."""
        text = (content or "").strip()
        if not text:
            return
        self.messages.append({"role": "assistant", "content": text})

        # Persist conversation turn to memory history
        last_user = ""
        for m in reversed(self.messages[:-1]):
            if m.get("role") == "user":
                last_user = m.get("content", "")
                break
        if last_user:
            self.memory_system.record_conversation_turn(last_user, text)

        self._prune_history()

    def get_messages(self, include_system: bool = True) -> List[Dict[str, str]]:
        """
        Return the conversation message history for Ollama or LLM chat endpoints.
        Injects system personality and natural memory context if include_system is True.
        """
        history_copy = [dict(msg) for msg in self.messages]

        if not include_system:
            return history_copy

        # Build natural memory context based on latest user turn
        latest_user_text = ""
        for m in reversed(self.messages):
            if m.get("role") == "user":
                latest_user_text = m.get("content", "")
                break

        memory_prompt = self.memory_system.build_system_memory_prompt(latest_user_text)
        full_system = SYSTEM_PROMPT
        if memory_prompt:
            full_system = f"{SYSTEM_PROMPT}\n{memory_prompt}"

        return [{"role": "system", "content": full_system}] + history_copy

    def clear(self):
        """Reset active conversation memory window."""
        self.messages.clear()
        logger.info("[ConversationManager] Conversation history window cleared.")

    def get_formatted_prompt(self, tokenizer=None) -> str:
        """
        Format conversation history into prompt string using tokenizer or Gemma 3 chat structure,
        including personality and personal memory.
        """
        if not self.messages:
            raise ValueError("Conversation history is empty.")

        messages_with_system = self.get_messages(include_system=True)

        if tokenizer is not None and hasattr(tokenizer, "apply_chat_template"):
            try:
                return tokenizer.apply_chat_template(
                    messages_with_system,
                    tokenize=False,
                    add_generation_prompt=True
                )
            except Exception as e:
                logger.warning(f"Tokenizer chat template failed ({e}), falling back to standard format.")

        # Standard Gemma 3 chat template format
        formatted = ""
        for msg in messages_with_system:
            role = msg["role"]
            if role == "assistant":
                role = "model"
            elif role == "system":
                # For Gemma turns, system context can be presented under model or user guidance
                formatted += f"<start_of_turn>user\n[System Instructions & Context]:\n{msg['content']}<end_of_turn>\n"
                continue
            formatted += f"<start_of_turn>{role}\n{msg['content']}<end_of_turn>\n"
        formatted += "<start_of_turn>model\n"
        return formatted

    def _prune_history(self):
        """
        Enforce max_messages limit by discarding oldest turns.
        Preserves complete messages and ensures history starts with a user turn.
        """
        if len(self.messages) <= self.max_messages:
            return

        trimmed = self.messages[-self.max_messages:]
        while trimmed and trimmed[0].get("role") != "user":
            trimmed.pop(0)

        if not trimmed and self.messages:
            trimmed = [self.messages[-1]]

        dropped_count = len(self.messages) - len(trimmed)
        if dropped_count > 0:
            logger.info(f"[ConversationManager] Pruned {dropped_count} old messages to maintain context limit.")

        self.messages = trimmed


# Default singleton instance for single-session use
default_conversation = ConversationManager()
