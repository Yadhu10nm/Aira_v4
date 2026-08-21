"""
AYRA Response Cleaner
---------------------
Cleans raw LLM output before returning it to the Control layer.

Responsibilities:
    - Remove thinking blocks
    - Remove tool-call blocks
    - Remove unwanted special tokens
    - Normalize whitespace
    - Return clean text

This module does NOT:
    - Call Ollama
    - Build prompts
    - Manage memory
"""

import re


# ---------------------------------------------------------
# PATTERNS
# ---------------------------------------------------------

THINK_PATTERN = re.compile(
    r"<think>.*?</think>",
    flags=re.DOTALL | re.IGNORECASE
)

ENCODED_THINK_PATTERN = re.compile(
    r"&lt;think&gt;.*?&lt;/think&gt;",
    flags=re.DOTALL | re.IGNORECASE
)

TOOL_CALL_PATTERN = re.compile(
    r"<tool_call>.*?</tool_call>",
    flags=re.DOTALL | re.IGNORECASE
)

ENCODED_TOOL_CALL_PATTERN = re.compile(
    r"&lt;tool_call&gt;.*?&lt;/tool_call&gt;",
    flags=re.DOTALL | re.IGNORECASE
)


# ---------------------------------------------------------
# MAIN CLEANER
# ---------------------------------------------------------

def clean_response(text):
    """
    Clean the raw response received from the LLM.

    Args:
        text (str):
            Raw model output.

    Returns:
        str:
            Cleaned response.
    """

    if text is None:
        return ""

    text = str(text)

    if not text.strip():
        return ""

    # -----------------------------------------------------
    # REMOVE THINKING BLOCKS
    # -----------------------------------------------------

    text = THINK_PATTERN.sub("", text)

    text = ENCODED_THINK_PATTERN.sub("", text)

    # -----------------------------------------------------
    # REMOVE TOOL CALLS
    # -----------------------------------------------------

    text = TOOL_CALL_PATTERN.sub("", text)

    text = ENCODED_TOOL_CALL_PATTERN.sub("", text)

    # -----------------------------------------------------
    # HANDLE LEFTOVER THINKING TAGS
    # -----------------------------------------------------

    text = re.sub(
        r"</think>",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"&lt;/think&gt;",
        "",
        text,
        flags=re.IGNORECASE
    )

    # -----------------------------------------------------
    # REMOVE COMMON MODEL SPECIAL TOKENS
    # -----------------------------------------------------

    special_tokens = [
        "<|end_of_text|>",
        "<|eot_id|>",
        "<|end|>",
        "<|assistant|>",
        "<|user|>",
        "<|system|>",
    ]

    for token in special_tokens:
        text = text.replace(token, "")

    # -----------------------------------------------------
    # REMOVE UNNECESSARY WHITESPACE
    # -----------------------------------------------------

    text = re.sub(
        r"[ \t]+",
        " ",
        text
    )

    # Normalize excessive newlines while preserving
    # paragraph separation.
    text = re.sub(
        r"\n\s*\n\s*\n+",
        "\n\n",
        text
    )

    # Remove spaces around newlines
    text = re.sub(
        r" *\n *",
        "\n",
        text
    )

    # -----------------------------------------------------
    # FINAL CLEANUP
    # -----------------------------------------------------

    return text.strip()