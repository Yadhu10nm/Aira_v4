"""
Control layer for AYRA voice interaction.
Routes transcribed user text to the Aira Gemma 3 4B + LoRA model,
persists conversation memory, and returns Aira's reply.
"""

import sys
import os
import time
import asyncio
import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.aira_model import get_aira_model
from core.conversation import default_conversation
from core.response_processor import AiraResponseProcessor
from MEMORY.memory import Memory


class Control:
    """Manage user-to-AI request flow and persist chat memory."""

    def __init__(self) -> None:
        """Initialize the AYRA Gemma 3 4B LoRA brain and memory backend."""
        self.aira_model = get_aira_model()
        if not self.aira_model.is_loaded:
            self.aira_model.load()
        self.conversation = default_conversation
        self.processor = AiraResponseProcessor()
        self.m = Memory()
        print("[+] AIRA Brain (Gemma 3 4B + LoRA) connected to Control.")

    def Ctrl(self, text):
        """Send user text to AIRA and store the response in memory.

        Args:
            text (str): Transcribed user input.

        Returns:
            str | None: AYRA response text, or None when no text is provided.
        """
        try:
            if text:
                t0 = time.time()
                self.conversation.add_user_message(text)
                prompt = self.conversation.get_formatted_prompt(self.aira_model.tokenizer)

                # Run inference synchronously if called from non-async context
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = None

                if loop and loop.is_running():
                    future = asyncio.run_coroutine_threadsafe(
                        self.aira_model.generate(prompt),
                        loop
                    )
                    raw_response = future.result(timeout=60)
                else:
                    raw_response = asyncio.run(self.aira_model.generate(prompt))

                self.conversation.add_assistant_message(raw_response)
                processed = self.processor.process(raw_response, text)
                response = processed["text"]

                print(f"LLM time: {time.time() - t0:.2f}s")
                print(f"You: {text}")
                print(f"Aira: {response}")

                if response and isinstance(response, str):
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
            return "Bro, something went wrong."


if __name__ == "__main__":
    print("Ayra conversational mode running. Type 'exit' to quit.")
    ctrl = Control()
    while True:
        try:
            text = input("\nYou: ").strip()
            if text.lower() in ["exit", "quit", "bye"]:
                print("Exiting Ayra...")
                break
            ctrl.Ctrl(text)
        except KeyboardInterrupt:
            print("\nStopping Ayra...")
            break
        except Exception as exc:
            print("Error:", exc)
