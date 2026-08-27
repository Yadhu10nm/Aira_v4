"""
Control layer for AYRA voice interaction.

This module receives transcribed user text from the voice frontend, forwards
it to the brain/LLM layer, logs the conversation, and returns AYRA's reply.
"""

import sys
import os
import time
import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from BRAIN.brain import Ayra
from MEMORY.memory import Memory


class Control:
    """Manage the voice-to-AI request flow and persist chat memory."""

    def __init__(self):
        """Initialize the AYRA Brain and memory backend."""
        self.ayra = Ayra()
        print("AYRA connected to Ollama.")
        self.m = Memory()

    def Ctrl(self, text):
        """Send user text to AYRA and store the response in memory.

        Args:
            text (str): Transcribed user input.

        Returns:
            str | None | bool: AYRA response text, None when no text is provided,
            or True on handled exception.
        """
        try:
            if text:
                t = time.time()
                recent_chats = self.m.recent_chats(limit=5)
                response = self.ayra.ai(text, context=recent_chats)
                print("LLM:", time.time() - t)
                print()
                print("You:", text)
                print("Aira:", response)

                if response:
                    chat = {
                        "date": datetime.datetime.now().strftime("%d-%m-%Y %H:%M:%S"),
                        "time": str(datetime.datetime.now()),
                        "user": text,
                        "ayra": response
                    }
                    self.m.memory(chat)
                    return response    
            return None
        
        except Exception as exc:
            print("Control command failed:", exc)
            return True




if __name__ == "__main__":
    print("Ayra voice mode is running. Press Ctrl+C to stop.")
    ctrl = Control()
    while True:
        try:
            text = input("You: ")
            if text.lower() in ["exit", "quit", "bye"]:
                print("Exiting Ayra...")
                break
            ctrl.Ctrl(text)
        except KeyboardInterrupt:
            print("\nStopping Ayra...")
            break
        except Exception as exc:
            print("Error:", exc)
   