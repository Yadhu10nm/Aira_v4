"""
AYRA Brain
----------
Main interface between the Control layer and the Gemma 3 4B LoRA model.
"""

import os
import sys
import asyncio

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.aira_model import get_aira_model
from core.conversation import default_conversation
from core.response_processor import AiraResponseProcessor


class Ayra:
    """
    Main AYRA Brain interface backed by fine-tuned Gemma 3 4B LoRA.

    Usage:
        ayra = Ayra()
        response = ayra.ai("Hello Aira")
    """

    def __init__(self):
        self.model = get_aira_model()
        if not self.model.is_loaded:
            self.model.load()
        self.conversation = default_conversation
        self.processor = AiraResponseProcessor()
        print("[+] AYRA Brain Ready (Gemma 3 4B + LoRA)")

    def ai(self, text, context=None):
        """Generate response from Aira LoRA brain."""
        if not text or not text.strip():
            return None

        try:
            self.conversation.add_user_message(text)
            messages = self.conversation.get_messages()
            prompt = self.conversation.get_formatted_prompt(self.model.tokenizer)

            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                future = asyncio.run_coroutine_threadsafe(
                    self.model.generate(prompt, messages=messages),
                    loop
                )
                raw_response = future.result(timeout=60)
            else:
                raw_response = asyncio.run(self.model.generate(prompt, messages=messages))

            self.conversation.add_assistant_message(raw_response)
            processed = self.processor.process(raw_response, text)

            return processed["text"]

        except Exception as exc:
            print(f"AYRA BRAIN ERROR ({type(exc).__name__}): {exc}")
            return "Bro, something went wrong."


if __name__ == "__main__":
    ayra = Ayra()
    print("\nAYRA Brain Ready. Type 'exit' to stop.\n")
    while True:
        try:
            user = input("You: ").strip()
            if user.lower() in {"exit", "quit"}:
                break
            if not user:
                continue
            response = ayra.ai(user)
            print(f"AYRA: {response}\n")
        except KeyboardInterrupt:
            break
