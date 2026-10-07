"""
AIRA Response Processor.
Transforms raw LLM (Ollama / Gemma) output into clean spoken text paired with
avatar animation and emotional expression metadata determined by the custom Aira Decision Engine.
"""

import re
import logging
from typing import Dict, Any

from .decision_engine import get_decision_engine

logger = logging.getLogger("aira.processor")


class AiraResponseProcessor:
    """Processes LLM text into clean speech text and avatar control metadata."""

    def __init__(self):
        self.decision_engine = get_decision_engine()

    def process(self, raw_text: str, user_text: str = "") -> Dict[str, Any]:
        """
        Process LLM output text into clean dialogue and avatar metadata.

        Args:
            raw_text: Generated text from Ollama or conversational LLM.
            user_text: Original user query context.

        Returns:
            Dict containing clean text, emotion, animation, intensity, duration, etc.
        """
        if not raw_text or not raw_text.strip():
            return {
                "text": "",
                "raw_text": "",
                "emotion": "neutral",
                "animation": "idle",
                "expression": "neutral",
                "intensity": 0.75,
                "duration": 1.5,
                "soften_intensity": 0.25,
                "confidence": 1.0,
                "tone": "neutral"
            }

        decision = self.decision_engine.decide(raw_text, user_text)

        return {
            "text": decision["text"],
            "raw_text": raw_text,
            "emotion": decision["emotion"],
            "animation": decision["animation"],
            "expression": decision["emotion"],
            "intensity": decision["intensity"],
            "duration": decision["duration"],
            "soften_intensity": decision["soften_intensity"],
            "confidence": decision["confidence"],
            "tone": decision["tone"],
            "decision": decision
        }
