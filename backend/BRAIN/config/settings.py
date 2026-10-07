"""
AYRA Brain Configuration
------------------------
Loads environment variables and exposes all Brain settings
through a single Settings object.
"""

import os
from pathlib import Path

from BRAIN.prompts.system import SYSTEM_PROMPT

# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------

# Project root
BASE_DIR = Path(__file__).resolve().parents[2]

# .env location
ENV_FILE = BASE_DIR / ".env"


# ---------------------------------------------------------
# ENVIRONMENT LOADER
# ---------------------------------------------------------

def load_env():
    """
    Load variables from the project's .env file.

    Existing environment variables are never overwritten.
    """

    if not ENV_FILE.exists():
        return

    try:
        for line in ENV_FILE.read_text(
            encoding="utf-8"
        ).splitlines():

            line = line.strip()

            # Ignore empty lines and comments
            if not line or line.startswith("#"):
                continue

            # Ignore invalid lines
            if "=" not in line:
                continue

            key, value = line.split("=", 1)

            key = key.strip()
            value = value.strip()

            # Remove surrounding quotes
            value = value.strip('"').strip("'")

            os.environ.setdefault(key, value)

    except OSError as exc:
        print(f"AYRA: Could not read .env file: {exc}")


load_env()


# ---------------------------------------------------------
# TYPE CONVERSION HELPERS
# ---------------------------------------------------------

def _get_int(name, default):
    """
    Read an integer environment variable.
    """

    value = os.getenv(name)

    if value is None:
        return default

    try:
        return int(value)

    except ValueError:
        print(
            f"AYRA: Invalid integer for {name}. "
            f"Using default: {default}"
        )

        return default


def _get_float(name, default):
    """
    Read a floating-point environment variable.
    """

    value = os.getenv(name)

    if value is None:
        return default

    try:
        return float(value)

    except ValueError:
        print(
            f"AYRA: Invalid float for {name}. "
            f"Using default: {default}"
        )

        return default


# ---------------------------------------------------------
# SETTINGS
# ---------------------------------------------------------

class Settings:
    """
    Central configuration for the AYRA Brain.
    """

    def __init__(self):

        # -------------------------------------------------
        # OLLAMA
        # -------------------------------------------------

        self.ollama_url = os.getenv(
            "OLLAMA_URL",
            "http://127.0.0.1:11434"
        ).rstrip("/")

        self.ollama_model = os.getenv(
            "OLLAMA_MODEL",
            "gemma3:4b-it-q4_K_M "
        )

        # -------------------------------------------------
        # MODEL PARAMETERS
        # -------------------------------------------------

        # 2048 is optimal for fast conversational voice turn latency
        self.context_size = _get_int(
            "AYRA_CONTEXT_SIZE",
            2048
        )

        # 160 tokens is ideal for 1-3 spoken conversational sentences (~1.2s max)
        self.max_tokens = _get_int(
            "AYRA_MAX_TOKENS",
            160
        )

        self.temperature = _get_float(
            "AYRA_TEMPERATURE",
            0.6
        )

        # -------------------------------------------------
        # CONNECTION
        # -------------------------------------------------

        self.request_timeout = _get_int(
            "AYRA_REQUEST_TIMEOUT",
            60
        )

        # Keep model loaded in VRAM/RAM so every turn responds instantly
        self.keep_alive = os.getenv(
            "AYRA_KEEP_ALIVE",
            "24h"
        ) or "24h"

        # -------------------------------------------------
        # SYSTEM PROMPT
        # -------------------------------------------------

        # Loaded separately from prompts/system.py
        self.system_prompt = SYSTEM_PROMPT


# ---------------------------------------------------------
# GLOBAL SETTINGS INSTANCE
# ---------------------------------------------------------

settings = Settings()