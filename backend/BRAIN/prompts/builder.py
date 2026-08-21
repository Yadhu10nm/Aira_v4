"""
AYRA Prompt Builder
-------------------
Builds the message structure sent to the LLM.

Responsibilities:
    - Add system prompt
    - Add optional retrieved context
    - Add current user message

This module does NOT:
    - Call Ollama
    - Store memory
    - Retrieve from ChromaDB
    - Clean the model response
"""


def build_messages(
    system_prompt,
    user_text,
    context=None
):
    """
    Build messages for the LLM.

    Args:
        system_prompt (str):
            AYRA's system instructions.

        user_text (str):
            Current user message.

        context (optional):
            Retrieved context/memory. This can later come
            from ChromaDB/RAG.

    Returns:
        list: Ollama-compatible message list.
    """

    messages = []

    # ---------------------------------------------------------
    # SYSTEM MESSAGE
    # ---------------------------------------------------------

    messages.append({
        "role": "system",
        "content": system_prompt.strip()
    })

    # ---------------------------------------------------------
    # RETRIEVED CONTEXT
    # ---------------------------------------------------------

    if context:

        context_text = _format_context(context)

        if context_text:

            messages.append({
                "role": "system",
                "content": (
                    "Relevant information from memory:\n\n"
                    f"{context_text}"
                )
            })

    # ---------------------------------------------------------
    # USER MESSAGE
    # ---------------------------------------------------------

    messages.append({
        "role": "user",
        "content": user_text.strip()
    })

    return messages


def _format_context(context):
    """
    Convert retrieved context into text suitable for the LLM.

    Supports:
        - string
        - list of strings
        - list of dictionaries
    """

    if context is None:
        return ""

    # Already a string
    if isinstance(context, str):
        return context.strip()

    # List / collection
    if isinstance(context, (list, tuple)):

        formatted = []

        for item in context:

            if isinstance(item, str):

                item = item.strip()

                if item:
                    formatted.append(item)

            elif isinstance(item, dict):

                # Prefer common memory fields
                if "text" in item:
                    text = str(item["text"]).strip()

                elif "content" in item:
                    text = str(item["content"]).strip()

                elif "memory" in item:
                    text = str(item["memory"]).strip()

                else:
                    text = str(item).strip()

                if text:
                    formatted.append(text)

            else:

                text = str(item).strip()

                if text:
                    formatted.append(text)

        return "\n\n".join(formatted)

    # Any other object
    return str(context).strip()