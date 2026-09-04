"""
Speech-to-text module for AYRA voice input.

This module loads a Whisper-based speech recognition model and converts
uploaded audio bytes into text and language metadata.
"""

import os
import tempfile
from faster_whisper import WhisperModel


class Listen:
    """Transcribe audio data into text using Faster Whisper."""

    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        print("Loading STT model...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("STT Ready")

    def transcribe(self, audio_bytes):
        """Transcribe audio bytes to text and return (text, detected_language)."""
        temp = tempfile.NamedTemporaryFile(suffix=".webm", delete=False)
        try:
            temp.write(audio_bytes)
            temp.close()

            segments, info = self.model.transcribe(
                temp.name,
                language="en",
                beam_size=5,
                vad_filter=True,
                condition_on_previous_text=False
            )
            text = " ".join(segment.text for segment in segments).strip()
            print("Transcribed:", repr(text))
            return (text, info.language) if text else (None, None)

        except Exception as e:
            print("STT Error:", e)
            return None, None

        finally:
            try:
                os.remove(temp.name)
            except OSError:
                pass


