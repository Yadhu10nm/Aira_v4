/* =========================================================================
   TTS  –  audio playback + precision audio-synchronized viseme lip-sync

   Flow
   ────
   1. Caller passes the audio Blob received from FastAPI or TTS backend
      plus the reply text.
   2. Viseme timeline is built from the text using viseme.js (phonetic cadence).
   3. The Blob is decoded into an AudioBuffer via decodeAudioData().
   4. Exact timeScale is computed: timeScale = timelineDuration / audioDuration.
      This guarantees the visemes stretch/compress to EXACTLY match the spoken audio!
   5. An AnalyserNode analyzes the real-time speech waveform:
      - Reads RMS amplitude every frame.
      - If audio is silent (pauses between words/clauses, breaths, lead-in/trail-out silence),
        mouth closes naturally.
      - If audio is sounding, mouth opens dynamically according to the phonetic viseme
        and audio volume.
   6. On source.onended, speech cleanly terminates and safeEnd() fires.
   ========================================================================= */

import { buildVisemeTimeline, getVisemeState } from './viseme.js';

// ── Public lip-sync state read by the render loop ─────────────────────────
export const lipSyncState = {
  active:        false,  // true while AYRA is speaking
  currentViseme: null,   // 'A' | 'E' | 'I' | 'O' | 'U' | null
  visemeWeight:  0,      // 0–1 intensity of currentViseme
  nextViseme:    null,   // upcoming viseme for coarticulation blending
  nextWeight:    0,      // 0–1 intensity of nextViseme
};

// ── AudioContext (shared across plays) ─────────────────────────────────────
let audioContext   = null;
let analysisRafId  = null;

// Keep a reference to the currently playing source so stopTTS can kill it.
let _currentSource = null;

// Monotonic generation counter — each playTTS call gets a unique gen.
// Stale callbacks from previous plays self-cancel by comparing against this.
let _playGen = 0;

// Viseme timeline for the current utterance – rebuilt each playTTS call.
let _visemeTimeline = { timeline: [], duration: 0 };

// Reusable audio analysis buffer (512 samples)
const _timeDomainData = new Uint8Array(512);

// ── Ensure AudioContext exists ─────────────────────────────────────────────
function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// ── Per-frame audio-synchronized viseme loop ──────────────────────────────
function startAnalysisLoop(analyser, audioStartTime, timeScale, audioDuration, onFinished) {
  stopAnalysisLoop();

  (function tick() {
    if (!lipSyncState.active) return;

    const elapsed = audioContext ? (audioContext.currentTime - audioStartTime) : 0;

    // If past audio duration + small margin, finish up
    if (audioDuration > 0 && elapsed >= audioDuration + 0.1) {
      onFinished?.();
      return;
    }

    // 1. Proportional time lookup into phonetic viseme timeline
    const mappedTime = elapsed * timeScale;
    const vs = getVisemeState(_visemeTimeline.timeline, mappedTime);

    // 2. Real-time audio amplitude (RMS) from speech waveform
    let rms = 0;
    if (analyser) {
      analyser.getByteTimeDomainData(_timeDomainData);
      let sum = 0;
      const step = 4; // fast stride for performance (<0.02ms)
      const count = _timeDomainData.length / step;
      for (let i = 0; i < _timeDomainData.length; i += step) {
        const val = (_timeDomainData[i] - 128) / 128;
        sum += val * val;
      }
      rms = Math.sqrt(sum / count);
    }

    // Dynamic speech energy:
    // Silence floor (~0.012). Below this, mouth closes (natural pause / breath).
    // Above this, voice is active and mouth opens articulately.
    const SILENCE_FLOOR = 0.012;
    const PEAK_VOL = 0.18;

    let energy = 0;
    if (rms > SILENCE_FLOOR) {
      energy = Math.min(1.0, (rms - SILENCE_FLOOR) / (PEAK_VOL - SILENCE_FLOOR));
    }

    if (!vs.viseme || energy <= 0.01) {
      // Natural silence: mouth relaxes shut
      lipSyncState.currentViseme = vs.viseme;
      lipSyncState.visemeWeight  = 0;
      lipSyncState.nextViseme    = vs.nextViseme;
      lipSyncState.nextWeight    = 0;
    } else {
      // Active vocal articulation: mouth opens with correct viseme shape & energy
      const vocalWeight = 0.40 + 0.60 * energy;
      lipSyncState.currentViseme = vs.viseme;
      lipSyncState.visemeWeight  = vs.weight * vocalWeight;
      lipSyncState.nextViseme    = vs.nextViseme;
      lipSyncState.nextWeight    = (vs.nextWeight || 0) * vocalWeight;
    }

    analysisRafId = requestAnimationFrame(tick);
  })();
}

function stopAnalysisLoop() {
  if (analysisRafId !== null) {
    cancelAnimationFrame(analysisRafId);
    analysisRafId = null;
  }
}

// ── Stop the currently playing buffer source ───────────────────────────────
function stopCurrentSource() {
  if (_currentSource) {
    try { _currentSource.stop(); } catch (_) { /* already ended */ }
    _currentSource.disconnect?.();
    _currentSource = null;
  }
}

/**
 * Reset lip-sync state to neutral when speech stops.
 */
function resetLipSyncState() {
  lipSyncState.currentViseme = null;
  lipSyncState.visemeWeight  = 0;
  lipSyncState.nextViseme    = null;
  lipSyncState.nextWeight    = 0;
}

/**
 * Play TTS audio and drive audio-synchronized viseme lip sync.
 *
 * @param {string}   text       - Spoken text (used for phonetic viseme timeline)
 * @param {Blob}     audioBlob  - Raw audio WAV data from backend
 * @param {number}   _startTime - (ignored) reserved for compatibility
 * @param {Function} [onEnd]    - Called when audio finishes (or on error)
 */
export async function playTTS(text, audioBlob, _startTime, onEnd = null) {
  const gen = ++_playGen;

  // ── Build viseme timeline from text ──────────────────────────────────────
  _visemeTimeline = buildVisemeTimeline(text || '');

  // ── Set up safe one-shot callback ────────────────────────────────────────
  let finished = false;
  const safeEnd = () => {
    if (finished) return;
    finished = true;
    if (gen !== _playGen) return;
    lipSyncState.active = false;
    resetLipSyncState();
    stopAnalysisLoop();
    stopCurrentSource();
    onEnd?.();
  };

  if (!text?.trim()) {
    safeEnd();
    return;
  }

  // ── Synthetic fallback when no audio blob exists ─────────────────────────
  if (!audioBlob || audioBlob.size === 0) {
    lipSyncState.active = true;
    const duration = Math.max(_visemeTimeline.duration, text.trim().length * 0.08, 1.5);
    const synthStart = performance.now();

    const synthTick = () => {
      if (!lipSyncState.active) return;
      const t = (performance.now() - synthStart) / 1000;
      if (t >= duration) {
        safeEnd();
        return;
      }
      const vs = getVisemeState(_visemeTimeline.timeline, t);
      lipSyncState.currentViseme = vs.viseme;
      lipSyncState.visemeWeight  = vs.weight;
      lipSyncState.nextViseme    = vs.nextViseme;
      lipSyncState.nextWeight    = vs.nextWeight;

      analysisRafId = requestAnimationFrame(synthTick);
    };

    synthTick();
    return;
  }

  // ── Real Audio Path ──────────────────────────────────────────────────────
  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  stopCurrentSource();

  let audioBuffer;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error('[TTS] decodeAudioData failed:', err);
    safeEnd();
    return;
  }

  const audioDuration = audioBuffer.duration;
  const timelineDuration = _visemeTimeline.duration;

  // Time-stretch ratio: aligns viseme timeline precisely with audio duration
  const timeScale = (audioDuration > 0 && timelineDuration > 0)
    ? (timelineDuration / audioDuration)
    : 1.0;

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.2;

  source.connect(analyser);
  analyser.connect(ctx.destination);

  _currentSource = source;

  const audioStartTime = ctx.currentTime;
  lipSyncState.active = true;
  resetLipSyncState();

  startAnalysisLoop(analyser, audioStartTime, timeScale, audioDuration, safeEnd);

  source.onended = safeEnd;
  source.start();
}

export function stopTTS() {
  lipSyncState.active = false;
  resetLipSyncState();
  stopAnalysisLoop();
  stopCurrentSource();
}

export function warmAudio() {
  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
