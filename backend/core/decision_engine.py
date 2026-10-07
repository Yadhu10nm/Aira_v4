"""
AIRA Custom Decision Engine.
High-speed, nuanced affective decision making for VRM avatars.
Replaces external heavy routers with zero-latency (<2ms), locally tailored decisions:
- Emotion classification for Three.js VRM facial expressions (happy, smile, blush, curious, thinking, surprised, sad, angry, neutral)
- Gesture selection (wave, nod, tilt, idle)
- Dynamic reaction curves (intensity, peak duration, soften intensity)
- Natural text cleaning for speech synthesis (quotes normalization, markdown stripping, emoji removal)
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("aira.decision")


class AiraDecisionEngine:
    """Zero-latency, nuanced affective decision engine tailored for Aira."""

    _instance: Optional["AiraDecisionEngine"] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self._compile_patterns()
        self._initialized = True
        logger.info("[+] AIRA Custom Decision Engine initialized (Zero-latency native).")

    def _compile_patterns(self):
        """Compile regex patterns for high-speed matching."""
        # 1. Inline metadata tags e.g. [emotion:happy], [mood:blush], [gesture:wave]
        self.inline_tag_regex = re.compile(
            r"\[(?:emotion|mood|expression|gesture|action):([a-z_]+)\]",
            re.IGNORECASE
        )

        # 2. Asterisk actions e.g. *giggles*, *blushes*, *winks*, *sighs*, *chuckles*
        self.asterisk_regex = re.compile(r"\*([^*]+)\*")

        # 3. Category pattern matching with weighted cues
        self.emotion_lexicons = {
            "blush": [
                r"\b(blush(es|ing)?|flatter(ed|ing)?|shy|bashful|cutie|cute|adorable)\b",
                r"\b(you'?re so sweet|you make me blush|aww+|love you|fond of you)\b",
                r"\b(sweetheart|marry me|romantic|special to me|butterflies)\b",
                r"\b(handsome|gorgeous|charming|sweet of you)\b",
            ],
            "happy": [
                r"\b(haha+|hehe+|lol|lmao|yay+|hooray|hurrah|woohoo+)\b",
                r"\b(awesome|fantastic|wonderful|delighted|thrilled|super excited)\b",
                r"\b(so happy|great news|buzzing|celebrat(e|ing)|ecstatic|overjoyed)\b",
                r"\b(stoked|pumped|love this|having a blast|cheers)\b",
            ],
            "smile": [
                r"\b(glad to help|my pleasure|happy to help|anytime|no worries)\b",
                r"\b(good to see you|nice to meet you|welcome back|chilling)\b",
                r"\b(glad you|sweet|gentle|warmly|cheerful|feel free)\b",
                r"\b(sounds good|sounds great|fair enough|alrighty)\b",
            ],
            "surprised": [
                r"\b(wow+|whoa+|wait,? what|no way|unbelievable|mind blown)\b",
                r"\b(shocking|astonishing|gasp|really\?!|seriously\?!|are you serious)\b",
                r"\b(incredible|can'?t believe|unexpected|holy cow|omg)\b",
            ],
            "curious": [
                r"\b(tell me more|wondering|curious|intrigued|how come)\b",
                r"\b(what do you think|how do you feel|what'?s your take)\b",
                r"\b(do you know|have you ever|what about you|what happened)\b",
            ],
            "thinking": [
                r"\b(hmm+|let me think|let me see|considering|analyzing)\b",
                r"\b(evaluating|reflecting|pondering|on one hand|technically)\b",
                r"\b(let'?s calculate|to solve this|the reason is|step by step)\b",
                r"\b(if we examine|the concept of|algorithm|hypothesis)\b",
            ],
            "sad": [
                r"\b(sorry to hear|heartbreaking|condolences|painful|sorrow)\b",
                r"\b(so sad|feeling down|overwhelmed|tough day|heavy load)\b",
                r"\b(grief|crying|depressed|heartbroken|hurts|feel for you)\b",
                r"\b(stay strong|here for you|it'?s okay to cry|not okay)\b",
                r"\b(unfortunate|tragic|terrible news|rough time)\b",
            ],
            "angry": [
                r"\b(stop that|unacceptable|annoying|annoyed|irritated|frustrated|frustrating|infuriating)\b",
                r"\b(ridiculous|not cool|outrageous|furious|angry|pissed|hate|unfair|terrible)\b",
                r"\b(offensive|back off|disrespectful|how dare you|leave me alone)\b",
            ]
        }

        # Pre-compile emotion regexes
        self.compiled_emotions = {
            emo: [re.compile(p, re.IGNORECASE) for p in patterns]
            for emo, patterns in self.emotion_lexicons.items()
        }

        # Greeting patterns for wave animation
        self.greeting_regex = re.compile(
            r"^(hey|hello|hi|hiya|howdy|good (morning|afternoon|evening)|welcome back|wassup|bye|goodbye|see ya|cya)\b",
            re.IGNORECASE
        )

        # Agreement patterns for nod
        self.agreement_regex = re.compile(
            r"\b(exactly|definitely|absolutely|i agree|that'?s right|makes sense|precisely|spot on)\b",
            re.IGNORECASE
        )

    def clean_text_for_speech(self, raw_text: str) -> str:
        """
        Normalize quotes/dashes, strip markdown formatting, bracket tags,
        and emojis so TTS speaks pure, natural conversational human dialogue.
        """
        if not raw_text:
            return ""

        text = raw_text

        # 1. Normalize smart quotes and dashes to clean ASCII
        text = text.replace("’", "'").replace("‘", "'")
        text = text.replace("“", '"').replace("”", '"')
        text = text.replace("—", " - ").replace("–", " - ")

        # 2. Strip bracketed inline metadata tags e.g. [emotion:happy]
        text = self.inline_tag_regex.sub("", text)

        # 3. Strip stage directions / asterisk actions e.g. *giggles*, *waves*
        text = self.asterisk_regex.sub("", text)

        # 4. Strip markdown formatting markers (*, _, #, `, ~, >)
        text = re.sub(r"[*_#`~>]", " ", text)

        # 5. Strip non-ASCII characters (emojis, unicode icons) that break TTS
        text = re.sub(r"[^\x00-\x7F]+", " ", text)

        # 6. Normalize multiple spaces and punctuation spacing
        text = re.sub(r"\s+", " ", text).strip()
        text = re.sub(r"\s+([,.\?!;:])", r"\1", text)

        return text

    clean_for_speech = clean_text_for_speech

    def decide(self, raw_text: str, user_text: str = "") -> Dict[str, Any]:
        """
        Analyze response text and user context to make lifelike avatar decisions.

        Args:
            raw_text: Generated assistant response.
            user_text: Prompt or question from the user.

        Returns:
            Dict containing:
                - text: Spoken clean dialogue
                - raw_text: Original text
                - emotion: Three.js VRM expression
                - animation: Avatar skeletal gesture
                - intensity: Expression weight (0.6 - 1.0)
                - duration: Reaction duration in seconds
                - soften_intensity: Residual expression intensity
                - tone: Tone description
                - confidence: Decision confidence
        """
        if not raw_text or not raw_text.strip():
            return {
                "text": "",
                "raw_text": "",
                "emotion": "neutral",
                "animation": "idle",
                "intensity": 0.75,
                "duration": 1.5,
                "soften_intensity": 0.25,
                "tone": "neutral",
                "confidence": 1.0
            }

        # 1. Clean speech text
        clean_text = self.clean_text_for_speech(raw_text)
        final_text = clean_text or raw_text.strip()

        # 2. Check for explicit inline tag override e.g. [emotion:blush]
        tag_match = self.inline_tag_regex.search(raw_text)
        if tag_match:
            explicit_emo = tag_match.group(1).lower()
            if explicit_emo in ("happy", "smile", "blush", "curious", "thinking", "surprised", "sad", "angry", "neutral"):
                return {
                    "text": final_text,
                    "raw_text": raw_text,
                    "emotion": explicit_emo,
                    "animation": "wave" if self.greeting_regex.search(final_text) else "idle",
                    "intensity": 0.90,
                    "duration": 1.6,
                    "soften_intensity": 0.30,
                    "tone": explicit_emo,
                    "confidence": 1.0
                }

        # 3. Check for asterisk action cues in raw text
        asterisk_matches = self.asterisk_regex.findall(raw_text)
        asterisk_text = " ".join(asterisk_matches).lower()
        if "blush" in asterisk_text:
            return self._build_result(final_text, raw_text, "blush", "idle", 0.95, 1.8, "flattered/bashful", 0.98)
        if any(w in asterisk_text for w in ("giggle", "laugh", "chuckle", "smile")):
            return self._build_result(final_text, raw_text, "happy", "idle", 0.90, 1.6, "joyful", 0.95)
        if any(w in asterisk_text for w in ("sigh", "frown", "sad", "tear")):
            return self._build_result(final_text, raw_text, "sad", "idle", 0.90, 1.6, "sorrowful", 0.95)
        if any(w in asterisk_text for w in ("think", "ponder", "wonder")):
            return self._build_result(final_text, raw_text, "thinking", "idle", 0.85, 1.5, "contemplative", 0.90)

        # 4. Multi-factor affective score accumulation
        lower_reply = raw_text.lower()
        lower_user = (user_text or "").lower()

        scores: Dict[str, float] = {
            "blush": 0.0,
            "happy": 0.0,
            "smile": 0.0,
            "curious": 0.0,
            "thinking": 0.0,
            "surprised": 0.0,
            "sad": 0.0,
            "angry": 0.0,
            "neutral": 0.2  # Base neutral baseline
        }

        # Evaluate compiled emotion patterns
        for emo, patterns in self.compiled_emotions.items():
            for pat in patterns:
                matches = pat.findall(lower_reply)
                if matches:
                    scores[emo] += len(matches) * 1.5

        # Conversational context boosts based on user query
        if any(c in lower_user for c in ("cute", "pretty", "beautiful", "love you", "marry", "sweet", "blush")):
            scores["blush"] += 2.0

        if any(s in lower_user for s in ("sad", "depressed", "died", "pain", "crying", "lost", "bad day", "terrible day", "hurts")):
            scores["sad"] += 2.5

        if any(j in lower_user for j in ("joke", "funny", "haha", "lol", "lmao")):
            scores["happy"] += 1.5

        # Check for inquisitive question endings ("What do you think?", "How about you?")
        if "?" in lower_reply:
            question_segments = [s.strip() for s in lower_reply.split("?") if s.strip()]
            if question_segments:
                last_segment = question_segments[-1]
                if any(w in last_segment for w in ("you", "your", "what", "how", "tell", "think", "mind")):
                    scores["curious"] += 2.0

        # Check for thinking markers (math, logic, analysis)
        if any(w in lower_reply for w in ("because", "therefore", "firstly", "specifically", "formula", "function")):
            scores["thinking"] += 0.8

        # Exclamations boost intensity and positive/surprise scores
        exclamation_count = raw_text.count("!")
        if exclamation_count > 0:
            if scores["happy"] > 0:
                scores["happy"] += 0.8 * exclamation_count
            if scores["surprised"] > 0:
                scores["surprised"] += 0.8 * exclamation_count

        # 5. Determine winning emotion
        best_emotion = max(scores, key=scores.get)
        best_score = scores[best_emotion]

        # If highest score is weak, fallback to neutral
        if best_score < 1.0:
            best_emotion = "neutral"

        # Special nuance: if both smile and happy scored, happy wins if exclamation or laugh is present
        if best_emotion == "smile" and (scores["happy"] > 1.0 or "!" in raw_text or "haha" in lower_reply):
            best_emotion = "happy"

        # 6. Gesture selection
        animation = "idle"
        # Greetings/goodbyes trigger frontside wave
        if self.greeting_regex.search(final_text) or (lower_user and self.greeting_regex.search(lower_user)):
            animation = "wave"
        elif self.agreement_regex.search(final_text) and best_emotion in ("neutral", "smile", "happy"):
            animation = "idle"  # Avatar can nod or stay idle

        # 7. Dynamic intensity & curve calibration
        intensity = 0.80
        duration = 1.5
        soften = 0.25

        if best_emotion in ("happy", "surprised", "angry"):
            intensity = min(1.0, 0.85 + 0.05 * exclamation_count)
            duration = 1.8
            soften = 0.30
        elif best_emotion == "blush":
            intensity = 0.92
            duration = 2.0
            soften = 0.35
        elif best_emotion == "sad":
            intensity = 0.85
            duration = 1.8
            soften = 0.28
        elif best_emotion in ("curious", "thinking"):
            intensity = 0.78
            duration = 1.4
            soften = 0.22
        elif best_emotion == "neutral":
            intensity = 0.65
            duration = 1.2
            soften = 0.20

        confidence = min(0.99, max(0.50, 0.50 + best_score * 0.15))

        return {
            "text": final_text,
            "raw_text": raw_text,
            "emotion": best_emotion,
            "animation": animation,
            "intensity": round(intensity, 2),
            "duration": round(duration, 2),
            "soften_intensity": round(soften, 2),
            "tone": best_emotion,
            "confidence": round(confidence, 2)
        }

    def _build_result(self, clean_text, raw_text, emotion, animation, intensity, duration, tone, confidence):
        return {
            "text": clean_text,
            "raw_text": raw_text,
            "emotion": emotion,
            "animation": animation,
            "intensity": intensity,
            "duration": duration,
            "soften_intensity": round(intensity * 0.35, 2),
            "tone": tone,
            "confidence": confidence
        }


_engine_instance: Optional[AiraDecisionEngine] = None


def get_decision_engine() -> AiraDecisionEngine:
    """Access singleton decision engine."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = AiraDecisionEngine()
    return _engine_instance
