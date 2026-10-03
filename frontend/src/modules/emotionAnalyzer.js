/* =========================================================================
   EMOTION ANALYZER  –  Infer facial expressions and gestures from dialogue
   
   Supports:
   1. Inline action tags from LLM: [emotion:smile], [gesture:hey], [gesture:wave]
   2. Direct user expression commands: "can you smile?", "blush for me", "look angry", "wave at me"
   3. Natural conversational context & sentiment in reply text
   ========================================================================= */

/**
 * Analyzes conversational text from the user and backend to determine
 * the appropriate facial expression profile and physical gesture.
 *
 * @param {string} replyText - Backend response utterance
 * @param {string} userText  - Original user spoken prompt
 * @returns {{ emotion: string, gesture: string|null, intensity: number }}
 */
export function analyzeEmotion(replyText = '', userText = '') {
  const replyClean = String(replyText || '').trim();
  const replyLower = replyClean.toLowerCase();

  const userClean  = String(userText || '').trim();
  const userLower  = userClean.toLowerCase();

  // Combine both texts for context, prioritizing explicit user prompts
  const fullText = `${userLower} ${replyLower}`;

  // ── 1. Check for explicit inline tags from LLM: [emotion:...], [gesture:...]
  const emoTagMatch = replyLower.match(/\[(?:emotion|mood):([a-z_]+)\]/i) ||
                      userLower.match(/\[(?:emotion|mood):([a-z_]+)\]/i);

  const gestureTagMatch = replyLower.match(/\[(?:gesture|action):([a-z_]+)\]/i) ||
                          userLower.match(/\[(?:gesture|action):([a-z_]+)\]/i);

  let explicitGesture = gestureTagMatch ? gestureTagMatch[1] : null;
  if (explicitGesture === 'wave') explicitGesture = 'hey';

  if (emoTagMatch) {
    const emo = emoTagMatch[1];
    return {
      emotion: normalizeEmotionName(emo),
      gesture: explicitGesture,
      intensity: 0.95,
    };
  }

  // ── 2. Explicit User Expression Requests ("can you smile?", "look angry", etc.)
  // If Yadhu specifically requested an expression, fulfill that request immediately
  if (userLower) {
    // Wave request
    if (/\b(wave|waving|wave your hand|say hi and wave|say hello and wave)\b/i.test(userLower)) {
      return { emotion: 'smile', gesture: 'hey', intensity: 0.95 };
    }

    // Smile request
    if (/\b(smile|smiling|grin|show me a smile|can you smile|smile for me|give me a smile)\b/i.test(userLower)) {
      return { emotion: 'smile', gesture: null, intensity: 0.90 };
    }

    // Blush request
    if (/\b(blush|blushing|shy face|can you blush|make a blushing face|blush for me)\b/i.test(userLower)) {
      return { emotion: 'blush', gesture: null, intensity: 0.95 };
    }

    // Angry request
    if (/\b(angry|mad|furious|make an angry face|look angry|get angry|angry face|frown)\b/i.test(userLower)) {
      return { emotion: 'angry', gesture: null, intensity: 0.95 };
    }

    // Sad request
    if (/\b(sad|sorrow|cry|crying|look sad|be sad|show me a sad face|sad face)\b/i.test(userLower)) {
      return { emotion: 'sad', gesture: null, intensity: 0.90 };
    }

    // Surprised request
    if (/\b(surprised|surprise|shocked|astonished|look surprised|act surprised|surprised face)\b/i.test(userLower)) {
      return { emotion: 'surprised', gesture: null, intensity: 0.95 };
    }

    // Thinking request
    if (/\b(think|thinking|look thoughtful|show me your thinking face|ponder)\b/i.test(userLower)) {
      return { emotion: 'thinking', gesture: null, intensity: 0.90 };
    }

    // Happy request
    if (/\b(happy|joy|cheer|laugh|make a happy face|look happy|be happy|cheerful)\b/i.test(userLower)) {
      return { emotion: 'happy', gesture: null, intensity: 0.92 };
    }

    // Curious request
    if (/\b(curious|smirk|intrigued|look curious|show curiosity)\b/i.test(userLower)) {
      return { emotion: 'curious', gesture: null, intensity: 0.88 };
    }

    // Neutral request
    if (/\b(neutral|relax|calm down|reset face|normal face)\b/i.test(userLower)) {
      return { emotion: 'neutral', gesture: null, intensity: 1.0 };
    }
  }

  // ── 3. Greeting Detection ("hi", "hey", "hello", "howdy", "welcome")
  const hasGreeting = /\b(hey|hi|hello|howdy|welcome|greetings|hiya)\b/i.test(fullText);
  const isNegative = /\b(stop|angry|annoyed|unacceptable|furious|shut up|hate)\b/i.test(fullText);

  if (hasGreeting && !isNegative) {
    return {
      emotion: 'smile',
      gesture: explicitGesture || 'hey',
      intensity: 0.90,
    };
  }

  // ── 4. Blushing: compliments, sweet words, cute, shy
  if (/\b(blush|blushing|shy|sweet|cute|flatter|flattered|aww|awww|darling|sweetheart|adore|love you|hug|pretty|beautiful|charming)\b/i.test(fullText)) {
    return {
      emotion: 'blush',
      gesture: explicitGesture,
      intensity: 0.95,
    };
  }

  // ── 5. Joy / Happy: cheer, celebratory, laughter, enthusiasm
  if (
    /\b(yay|haha|hahaha|awesome|fantastic|wonderful|excited|exciting|celebrat|great news|overjoyed|thrilled|super happy|glad|fun|congratulations)\b/i.test(replyLower) ||
    /!{2,}/.test(replyClean)
  ) {
    return {
      emotion: 'happy',
      gesture: explicitGesture,
      intensity: 0.90,
    };
  }

  // ── 6. Thinking: questions, contemplation, analyzing, reasoning
  if (/\b(hmm|hmmm|wonder|analyze|analyzing|ponder|perhaps|maybe|let me see|let me think|difficult to say|curious to know|interesting question|evaluate|calculate|figure out)\b/i.test(replyLower)) {
    return {
      emotion: 'thinking',
      gesture: explicitGesture,
      intensity: 0.88,
    };
  }

  // ── 7. Surprised: shock, astonishment, disbelief
  if (
    /\b(wow|whoa|omg|unbelievable|no way|incredible|seriously\?|shocking|unexpected|astonishing)\b/i.test(replyLower) ||
    /\?{2,}|\?!|!\?/.test(replyClean)
  ) {
    return {
      emotion: 'surprised',
      gesture: explicitGesture,
      intensity: 0.95,
    };
  }

  // ── 8. Sad / Empathetic: sorrow, apology, condolences, sympathy
  if (/\b(sorry|sad|unfortunate|grief|heartbroken|apologize|apologies|condolences|miss you|pity|depressed|crying|painful|hurts|comfort)\b/i.test(replyLower)) {
    return {
      emotion: 'sad',
      gesture: explicitGesture,
      intensity: 0.90,
    };
  }

  // ── 9. Angry: frustration, indignation, disapproval
  if (/\b(angry|mad|furious|annoyed|unacceptable|stop it|shut up|hate|ridiculous|terrible|frustrated|wrong)\b/i.test(replyLower)) {
    return {
      emotion: 'angry',
      gesture: explicitGesture,
      intensity: 0.95,
    };
  }

  // ── 10. Curious: teasing, intrigue, smirking
  if (/\b(well well|tell me more|intriguing|mystery|secret|confess|guess what|what do you think|smirk|tease)\b/i.test(replyLower)) {
    return {
      emotion: 'curious',
      gesture: explicitGesture,
      intensity: 0.85,
    };
  }

  // ── 11. Friendly / Positive default
  if (/\b(good|nice|thank|thanks|sure|happy to|pleasure|enjoy|certainly|alright|fine|yes)\b/i.test(replyLower)) {
    return {
      emotion: 'smile',
      gesture: explicitGesture,
      intensity: 0.80,
    };
  }

  // ── 12. Neutral baseline
  return {
    emotion: 'neutral',
    gesture: explicitGesture,
    intensity: 0.65,
  };
}

/**
 * Normalizes expression alias names to canonical keys.
 */
function normalizeEmotionName(name) {
  if (!name) return 'neutral';
  const lower = name.toLowerCase().trim();
  if (lower === 'joy') return 'happy';
  if (lower === 'blushing') return 'blush';
  if (lower === 'think') return 'thinking';
  if (lower === 'surprise') return 'surprised';
  if (lower === 'mad') return 'angry';
  return lower;
}

/**
 * Quick boolean check if utterance has greeting words.
 */
export function isGreetingText(text) {
  if (!text) return false;
  return /\b(hey|hi|hello|howdy|welcome|greetings|hiya)\b/i.test(text);
}
