"""
Plain text response sanitizer.

Keeps AYRA replies suitable for terminal output, API responses, and TTS.
"""

import re


_ZERO_WIDTH_JOINER = 0x200D
_VARIATION_SELECTOR_START = 0xFE00
_VARIATION_SELECTOR_END = 0xFE0F
_COMBINING_ENCLOSING_KEYCAP = 0x20E3
_TAG_START = 0xE0020
_TAG_END = 0xE007F

_EMOJI_RANGES = (
    (0x1F000, 0x1FAFF),
    (0x2600, 0x27BF),
)


def _is_emoji_or_modifier(character):
    """Return True when a character belongs to common emoji codepoint ranges."""

    codepoint = ord(character)

    if codepoint == _ZERO_WIDTH_JOINER:
        return True

    if _VARIATION_SELECTOR_START <= codepoint <= _VARIATION_SELECTOR_END:
        return True

    if codepoint == _COMBINING_ENCLOSING_KEYCAP:
        return True

    if _TAG_START <= codepoint <= _TAG_END:
        return True

    return any(
        start <= codepoint <= end
        for start, end in _EMOJI_RANGES
    )


def remove_emojis(text):
    """Remove emojis and emoji composition characters from text."""

    return "".join(
        character
        for character in text
        if not _is_emoji_or_modifier(character)
    )


def make_plain_text(text):
    """
    Convert model output into plain text.

    Removes emojis, markdown emphasis markers, and extra spacing left behind
    after cleanup.
    """

    if text is None:
        return ""

    text = str(text)

    if not text.strip():
        return ""

    text = remove_emojis(text)
    text = text.replace("*", "")

    text = re.sub(
        r"[ \t]+",
        " ",
        text
    )

    text = re.sub(
        r" *\n *",
        "\n",
        text
    )

    text = re.sub(
        r"\n\s*\n\s*\n+",
        "\n\n",
        text
    )

    return text.strip()
