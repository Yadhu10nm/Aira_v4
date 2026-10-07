import json

from backend.core.memory_system import AiraMemorySystem


def test_recent_context_uses_only_last_three_valid_chats(tmp_path):
    history_path = tmp_path / "history.json"
    history_path.write_text(
        json.dumps([
            {"user": "first", "ayra": "first reply"},
            {"user": "second", "ayra": "second reply"},
            {"user": "broken", "ayra": "Something went wrong"},
            {"user": "third", "ayra": "third reply"},
            {"user": "fourth", "ayra": "fourth reply"},
            {"user": "fifth", "ayra": "fifth reply"},
        ]),
        encoding="utf-8",
    )
    memory = AiraMemorySystem(history_path=history_path)

    chats = memory.get_recent_chats()
    prompt = memory.build_system_memory_prompt()

    assert [chat["user"] for chat in chats] == ["third", "fourth", "fifth"]
    assert "first reply" not in prompt
    assert "broken" not in prompt
    assert "fifth reply" in prompt


def test_record_conversation_turn_appends_to_history(tmp_path):
    history_path = tmp_path / "history.json"
    history_path.write_text("[]", encoding="utf-8")
    memory = AiraMemorySystem(history_path=history_path)

    memory.record_conversation_turn("hello", "hi there")

    saved = json.loads(history_path.read_text(encoding="utf-8"))
    assert len(saved) == 1
    assert saved[0]["user"] == "hello"
    assert saved[0]["ayra"] == "hi there"
