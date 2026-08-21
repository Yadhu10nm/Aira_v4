"""
Text-to-speech module for AYRA voice output.

Generates WAV audio using KittenTTS and returns
an in-memory BytesIO buffer.
"""

import io
import re
import soundfile as sf
from kittentts import KittenTTS


class Speak:
    """Generate speech audio for AYRA replies."""

    def __init__(self):
        # Load model
        print("Loading KittenTTS...")
        self.model = KittenTTS("KittenML/kitten-tts-nano-0.8")
        print("KittenTTS loaded!")

        # Voice options:
        # Bella, Jasper, Luna, Bruno,
        # Rosie, Hugo, Kiki, Leo
        self.voice = "Kiki"
        self.speed = 1.0

    def _sanitize_text(self, text):
        """Clean the text before speech generation."""
        if not isinstance(text, str):
            text = str(text)

        text = text.replace("\r", " ")
        text = text.replace("\n", ". ")
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    def speak(self, text):
        """Generate speech and return a BytesIO WAV buffer."""
        text = self._sanitize_text(text)

        if not text:
            return None

        audio = self.model.generate(
            text=text,
            voice=self.voice,
            speed=self.speed,
            clean_text=True
        )

        wav_buffer = io.BytesIO()

        sf.write(
            wav_buffer,
            audio,
            samplerate=24000,
            format="WAV"
        )

        wav_buffer.seek(0)
        return wav_buffer


if __name__ == "__main__":
    tts = Speak()

    text = (
        "Hello! My name is Ayra. "
        "This is a test of the Kitten TTS voice model. "
        "I hope you have a wonderful day."
    )

    audio_buffer = tts.speak(text)

    if audio_buffer:
        # Save to file for testing
        with open("output.wav", "wb") as f:
            f.write(audio_buffer.getvalue())

        print("✅ Speech generated successfully!")
        print("Saved as: output.wav")
    else:
        print("❌ Failed to generate speech.")