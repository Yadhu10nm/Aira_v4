import pytest
import time
from backend.core.decision_engine import AiraDecisionEngine, get_decision_engine

def test_decision_engine_emotions():
    engine = AiraDecisionEngine()
    
    # Happy / joyful
    res = engine.decide("I'm so thrilled to see you! This is wonderful! 😊")
    assert res["emotion"] in ["happy", "smile"]
    assert res["intensity"] >= 0.7
    
    # Thinking
    res = engine.decide("Let me calculate that for you, hmm, let's think about this problem...")
    assert res["emotion"] in ["thinking", "curious"]
    
    # Curious / Questioning
    res = engine.decide("What is your favorite kind of music? Could you tell me more?")
    assert res["emotion"] in ["curious", "smile"]
    
    # Sad / Empathetic
    res = engine.decide("Oh no, I am so sorry to hear that. That must be heartbreaking.")
    assert res["emotion"] == "sad"
    assert res["intensity"] >= 0.6
    
    # Angry / Annoyed
    res = engine.decide("That is completely unfair and frustrating! I hate when that happens!")
    assert res["emotion"] == "angry"
    
    # Blush / Affectionate
    res = engine.decide("Aww thank you so much! You're making me blush, you're the sweetest! ❤️")
    assert res["emotion"] in ["blush", "happy", "smile"]

def test_decision_engine_gestures():
    engine = AiraDecisionEngine()
    
    # Greeting / waving
    res = engine.decide("Hello there! Welcome back to my studio!")
    assert res["animation"] == "wave"
    
    # Normal conversation
    res = engine.decide("The weather today is cloudy with a chance of rain.")
    assert res["animation"] == "idle"

def test_dialogue_cleaning():
    engine = AiraDecisionEngine()
    dirty_text = "**Hey there!** *giggles* I'm ‘Aira’ — your personal assistant! 😊🚀"
    cleaned = engine.clean_for_speech(dirty_text)
    
    # Markdown asterisks stripped
    assert "**" not in cleaned
    assert "*" not in cleaned
    # Curly quotes normalized
    assert "‘" not in cleaned and "’" not in cleaned
    # Non-ASCII emojis stripped for TTS compatibility
    assert "😊" not in cleaned
    assert "🚀" not in cleaned
    assert "Aira" in cleaned

def test_decision_engine_latency():
    engine = AiraDecisionEngine()
    sample = "Hello there! I'm really excited to help you build this new project today! *smiles warmly*"
    
    # Warmup
    for _ in range(5):
        engine.decide(sample)
        
    start = time.perf_counter()
    iterations = 100
    for _ in range(iterations):
        engine.decide(sample)
    elapsed = (time.perf_counter() - start) / iterations
    
    # Latency should be sub-millisecond (< 1.0 ms)
    assert elapsed < 0.002, f"Decision engine took {elapsed * 1000:.2f}ms, expected < 2ms"
