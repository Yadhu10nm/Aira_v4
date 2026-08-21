"""
AYRA Brain
----------
Main interface between the Control layer and the LLM.

Responsibilities:
    1. Receive user text from Control.
    2. Build the LLM messages.
    3. Send messages to Ollama.
    4. Clean the LLM response.
    5. Return the response to Control.

The Brain does NOT:
    - Store chat history
    - Manage JSON/ChromaDB memory
    - Handle STT/TTS
    - Handle server logic
    - Handle voice interaction
"""

from .config.settings import settings
from .llm.ollama import OllamaClient
from .prompts.builder import build_messages
from .processing.cleaner import clean_response


class Ayra:
    """
    Main AYRA Brain interface.

    Usage:
        ayra = Ayra()
        response = ayra.ai("Hello Ayra")
    """

    def __init__(self):
        self.client = OllamaClient(settings)

        print("\n========== AYRA BRAIN ==========")
        print(f"Model       : {settings.ollama_model}")
        print(f"Ollama URL  : {settings.ollama_url}")
        print(f"Context     : {settings.context_size}")
        print(f"Max Tokens  : {settings.max_tokens}")
        print(f"Temperature : {settings.temperature}")
        print("================================")

        self.client.check_connection()

    def ai(self, text, context=None):
       

        # Ignore empty input
        if not text or not text.strip():
            return None

        try:
            # -------------------------------------------------
            # 1. BUILD MESSAGES
            # -------------------------------------------------

            messages = build_messages(
                system_prompt=settings.system_prompt,
                user_text=text,
                context=context
            )

            # -------------------------------------------------
            # 2. SEND TO LLM
            # -------------------------------------------------

            response = self.client.chat(messages)

            # -------------------------------------------------
            # 3. CLEAN RESPONSE
            # -------------------------------------------------

            response = clean_response(response)

            # -------------------------------------------------
            # 4. EMPTY RESPONSE CHECK
            # -------------------------------------------------

            if not response:
                print("AYRA: Empty response received from LLM.")
                return "Bro, I couldn't generate a response."

            return response

        except Exception as exc:

            print(
                f"AYRA BRAIN ERROR "
                f"({type(exc).__name__}): {exc}"
            )

            return "Bro, something went wrong."


# -------------------------------------------------------------
# DIRECT TERMINAL TEST
# -------------------------------------------------------------

if __name__ == "__main__":

    ayra = Ayra()

    print("\nAYRA Brain Ready.")
    print("Type 'exit' or 'quit' to stop.\n")

    while True:

        try:
            user = input("You: ").strip()

            if user.lower() in {"exit", "quit"}:
                print("Exiting AYRA...")
                break

            if not user:
                continue

            response = ayra.ai(user)

            print(f"AYRA: {response}\n")

        except KeyboardInterrupt:
            print("\nStopping AYRA...")
            break

        except Exception as exc:
            print(f"Terminal error: {exc}")