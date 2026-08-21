/* =========================================================================
   VISEME  –  phoneme-timed lip-sync timeline builder + runtime state

   Architecture
   ────────────
   Vowels drive the five VRM mouth shapes (A/E/I/O/U) with a natural
   attack-sustain-release envelope.  Consonants are mapped to the most
   phonetically appropriate viseme at lower intensity.  Adjacent visemes
   overlap via `getVisemeState()` to produce coarticulation — the natural
   blending of mouth shapes that occurs in real speech.

   The timeline is built from text alone (no phoneme aligner needed),
   with per-character timing tuned for natural spoken cadence.
   ========================================================================= */

// ── Vowel → VRM viseme mapping ─────────────────────────────────────────────
const VOWEL_VISEME = { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U' };

// ── Consonant → closest visual mouth shape ─────────────────────────────────
// Bilabials (b,p,m) close the lips → U
// Labiodentals (f,v) pull lower lip → E
// Alveolars (t,d,n,s,z,l) spread → I
// Velars (k,g,ng,h) open → A
const CONSONANT_VISEME = {
  b: 'U', p: 'U', m: 'U',   // bilabial
  f: 'E', v: 'E',            // labiodental
  t: 'I', d: 'I', n: 'I', s: 'I', z: 'I', l: 'I',  // alveolar
  k: 'A', g: 'A', h: 'A',    // velar / glottal
  r: 'E',                    // approximant
  w: 'U', j: 'I', y: 'I',   // semi-vowel
  c: 'A', q: 'O', x: 'E',    // remaining letters
};

// ── Timing constants (seconds) ─────────────────────────────────────────────
const VOWEL_DUR       = 0.12;   // vowels get the most time
const CONSONANT_DUR   = 0.05;   // consonants are brief
const WORD_GAP        = 0.08;   // between words
const PUNCT_GAP       = 0.25;   // after punctuation
const END_GAP         = 0.30;   // silence after last word

// ── Viseme intensity weights ───────────────────────────────────────────────
const VOWEL_WEIGHT    = { A: 0.90, E: 0.80, I: 0.70, O: 0.85, U: 0.75 };
const CONSONANT_MULT  = 0.55;   // consonants are less pronounced

// ── Envelope phase thresholds (fraction of duration) ───────────────────────
const ATTACK_END   = 0.10;   // 0 → 10% : fade in
const SUSTAIN_END  = 0.65;   // 10% → 65% : hold
const RELEASE_END  = 1.0;    // 65% → 100% : fade out

// ── Coarticulation overlap ────────────────────────────────────────────────
// When current viseme is > 60% done, the next viseme begins blending in.
const OVERLAP_START  = 0.60;
const OVERLAP_END    = 1.00;
const OVERLAP_STRENGTH = 0.35;  // how much the next viseme intrudes


/* =========================================================================
   PUBLIC API
   ========================================================================= */

/**
 * Build a flat viseme event array from plain text.
 * Each entry: { t, viseme, weight, dur }
 *
 * @param {string} text  – The text to speak
 * @returns {{ timeline: Array, duration: number }}
 */
export function buildVisemeTimeline(text) {
  const timeline = [];
  let t = 0;
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);

  for (const word of words) {
    for (const ch of word) {
      if (VOWEL_VISEME[ch]) {
        const viseme = VOWEL_VISEME[ch];
        timeline.push({
          t,
          viseme,
          weight: VOWEL_WEIGHT[viseme],
          dur: VOWEL_DUR,
        });
        t += VOWEL_DUR;
      } else if (/[a-z]/.test(ch)) {
        // Consonant – map to the closest mouth shape
        const viseme = CONSONANT_VISEME[ch] || 'A';
        timeline.push({
          t,
          viseme,
          weight: CONSONANT_MULT,
          dur: CONSONANT_DUR,
        });
        t += CONSONANT_DUR;
      } else if (/[.,!?;:]/.test(ch)) {
        // Punctuation – brief silent gap
        timeline.push({ t, viseme: null, weight: 0, dur: PUNCT_GAP });
        t += PUNCT_GAP;
      }
    }
    // Word boundary – short gap
    timeline.push({ t, viseme: null, weight: 0, dur: WORD_GAP });
    t += WORD_GAP;
  }

  // Ensure a minimum duration so very short text still animates
  return { timeline, duration: Math.max(t, 0.3) };
}

/**
 * Return the active viseme state at a given playback time.
 *
 * Each viseme follows an attack-sustain-release envelope for natural
 * mouth movement.  Adjacent visemes overlap (coarticulation) so that
 * the transition from one vowel to the next is smooth rather than
 * robotic switching.
 *
 * @param {Array}  timeline – Array of { t, viseme, weight, dur }
 * @param {number} time     – Playback time in seconds
 * @returns {{
 *   viseme: string|null,
 *   weight: number,
 *   nextViseme: string|null,
 *   nextWeight: number
 * }}
 */
export function getVisemeState(timeline, time) {
  if (!timeline || timeline.length === 0) {
    return { viseme: null, weight: 0, nextViseme: null, nextWeight: 0 };
  }

  // Find the entry at or before the current time (rightmost match)
  let currentIdx = -1;
  for (let i = 0; i < timeline.length; i++) {
    if (time >= timeline[i].t) {
      currentIdx = i;
    }
  }

  // Before the first entry → silence
  if (currentIdx === -1) {
    return { viseme: null, weight: 0, nextViseme: null, nextWeight: 0 };
  }

  const current = timeline[currentIdx];
  const next    = currentIdx < timeline.length - 1
    ? timeline[currentIdx + 1]
    : null;

  // If this entry is a silent gap (punctuation, word break)
  if (!current.viseme) {
    return {
      viseme: null,
      weight: 0,
      nextViseme: next?.viseme || null,
      nextWeight: 0,
    };
  }

  // ── Local progress within the current viseme ───────────────────────────
  const elapsed = time - current.t;
  const progress = Math.min(1, elapsed / current.dur);

  // ── Attack-sustain-release envelope ──────────────────────────────────────
  let weight;
  if (progress < ATTACK_END) {
    // Attack: fade in
    weight = current.weight * (progress / ATTACK_END);
  } else if (progress < SUSTAIN_END) {
    // Sustain: hold at peak
    weight = current.weight;
  } else {
    // Release: gradually drop to zero
    const releaseProgress = (progress - SUSTAIN_END) / (RELEASE_END - SUSTAIN_END);
    weight = current.weight * Math.max(0, 1 - releaseProgress);
  }

  // ── Coarticulation: blend in next viseme before this one finishes ───────
  if (next && next.viseme && progress >= OVERLAP_START) {
    const overlapProgress =
      (progress - OVERLAP_START) / (OVERLAP_END - OVERLAP_START);
    const nextWeight = next.weight * Math.min(overlapProgress * 2, 1) * OVERLAP_STRENGTH;
    const decay = 1 - overlapProgress * 0.4;  // current viseme decays slightly

    return {
      viseme: current.viseme,
      weight: weight * decay,
      nextViseme: next.viseme,
      nextWeight,
    };
  }

  // Standard (no overlap yet)
  return {
    viseme: current.viseme,
    weight,
    nextViseme: null,
    nextWeight: 0,
  };
}

/**
 * Legacy alias – delegates to getVisemeState for backward compatibility.
 * Returns the entry itself (without blending) for simple use cases.
 */
export function visemeEntryAt(timeline, time) {
  const state = getVisemeState(timeline, time);
  if (!state.viseme) return null;
  return { t: time, viseme: state.viseme, weight: state.weight, dur: 0.1 };
}
