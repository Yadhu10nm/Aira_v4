"""
Central Configuration for AIRA AI Assistant.
Manages LLM parameters, paths, server settings, and conversation memory limits.
Supports both Ollama and Transformers/PEFT backends.
"""

import os
from pathlib import Path
import torch

# Base directories
BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent

# Ollama Backend Settings
USE_OLLAMA = os.getenv("USE_OLLAMA", "true").lower() in ("true", "1", "yes")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b-it-q4_K_M")

# Base Model & LoRA Adapter (for Transformers/PEFT mode)
AIRA_BASE_MODEL = os.getenv("AIRA_BASE_MODEL", "unsloth/gemma-3-4b-it-bnb-4bit")
AIRA_ADAPTER_PATH = os.getenv(
    "AIRA_ADAPTER_PATH",
    r"C:\aira_dataset\training\final_adapter"
)

# Generation Parameters
TEMPERATURE = float(os.getenv("AIRA_TEMPERATURE", "0.7"))
TOP_P = float(os.getenv("AIRA_TOP_P", "0.9"))
REPETITION_PENALTY = float(os.getenv("AIRA_REPETITION_PENALTY", "1.1"))
MAX_NEW_TOKENS = int(os.getenv("AIRA_MAX_NEW_TOKENS", "200"))

# Context & Memory Limits
MAX_HISTORY_MESSAGES = int(os.getenv("AIRA_MAX_HISTORY_MESSAGES", "20"))

# Server Network Settings
BACKEND_HOST = os.getenv("AIRA_HOST", "127.0.0.1")
BACKEND_PORT = int(os.getenv("AIRA_PORT", "8000"))

# Device & Performance Settings
DEVICE = os.getenv("AIRA_DEVICE", "cuda:0" if torch.cuda.is_available() else "cpu")

GENERATION_CONFIG = {
    "temperature": TEMPERATURE,
    "top_p": TOP_P,
    "repetition_penalty": REPETITION_PENALTY,
    "max_new_tokens": MAX_NEW_TOKENS,
    "do_sample": True,
}
