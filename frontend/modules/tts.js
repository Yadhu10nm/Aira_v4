/* =========================================================================
   TTS  –  audio playback + text-driven viseme lip-sync

   Flow
   ────
   1.  Caller passes the audio Blob received from FastAPI or TTS backend
       plus the reply text.
   2.  A viseme timeline is built from the text using the viseme module.
   3.  The Blob is decoded into an AudioBuffer via decodeAudioData().
   4.  A fresh AudioBufferSourceNode is created, connected through an
       AnalyserNode (kept for future use) to the destination, and started.
   5.  A requestAnimationFrame loop:
       a) Reads elapsed playback time → looks up current viseme from the
          viseme timeline.
       b) Writes viseme state to lipSyncState for the render loop.
   6.  On source.onended the loop stops and onEnd fires.

   ⚠️  Lip-sync is driven SOLELY by the response text via the viseme
       timeline.  The audio is used ONLY for playback — the AnalyserNode
       is wired for future use but does NOT control the avatar's mouth.

   Why AudioBufferSourceNode (not MediaElementAudioSourceNode)?
   ────────────────────────────────────────────────────────────
   MediaElementAudioSourceNode has a one-per-element constraint and
   triggers AbortError on repeated playback.  AudioBufferSourceNode
   avoids these issues — a fresh node is created per utterance with
   no permanent wiring that interferes with subsequent plays.
   ========================================================================= */

import { buildVisemeTimeline, getVisemeState } from './viseme.js';

// ── Public lip-sync state read by the render loop ─────────────────────────
export const lipSyncState = {
  active:       false,  // true while AYRA is speaking
  currentViseme: null,  // 'A' | 'E' | 'I' | 'O' | 'U' | null
  visemeWeight: 0,      // 0–1 intensity of currentViseme (from timeline envelope)
  nextViseme:   null,   // upcoming viseme for coarticulation blending
  nextWeight:   0,      // 0–1 intensity of nextViseme
};

// ── AudioContext (shared across plays) ─────────────────────────────────────
let audioContext  = null;
let analysisRafId = null;

// Keep a reference to the currently playing source so stopTTS can kill it.
let _currentSource = null;

// Monotonic generation counter — each playTTS call gets a unique gen.
// Stale callbacks from previous plays self-cancel by comparing against this.
let _playGen = 0;

// Viseme timeline for the current utterance – rebuilt each playTTS call.
let _visemeTimeline = { timeline: [], duration: 0 };

// ── Ensure AudioContext exists ─────────────────────────────────────────────
function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// ── Per-frame viseme tracking loop ───────────────────────────────────────
// Tracks playback time against the viseme timeline to update lip-sync state.
// No audio analysis is performed — mouth movement is driven purely by text.
const _analysisBuffer = new Uint8Array(512);   // kept for future audio analysis use

function startAnalysisLoop(analyser, audioStartTime) {
  stopAnalysisLoop();   // clean up any previous loop first

  (function tick() {
    if (!lipSyncState.active) return;   // loop stops itself

    // ── Viseme state from timeline (purely text-driven) ───────────────────
    const playbackTime = audioContext
      ? audioContext.currentTime - audioStartTime
      : 0;
    const vs = getVisemeState(_visemeTimeline.timeline, playbackTime);
    lipSyncState.currentViseme = vs.viseme;
    lipSyncState.visemeWeight  = vs.weight;
    lipSyncState.nextViseme    = vs.nextViseme;
    lipSyncState.nextWeight    = vs.nextWeight;

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
 * Play TTS audio and drive hybrid viseme + amplitude lip sync.
 *
 * @param {string}   text      - The spoken text (used for viseme timeline)
 * @param {Blob}     audioBlob - Raw audio data from the backend
 * @param {number}   _startTime- (ignored) reserved for compatibility
 * @param {Function} [onEnd]   - Called when audio finishes (or on error)
 */
export async function playTTS(text, audioBlob, _startTime, onEnd = null) {
  // ── Unique generation for this invocation ──────────────────────────────
  const gen = ++_playGen;

  // ── Build viseme timeline from text ──────────────────────────────────────
  _visemeTimeline = buildVisemeTimeline(text || '');

  // ── Set up safe one-shot callback ────────────────────────────────────────
  const safeEnd = () => {
    if (gen !== _playGen) return;         // a newer play superseded this one
    lipSyncState.active = false;
    resetLipSyncState();
    stopAnalysisLoop();
    stopCurrentSource();
    onEnd?.();
  };

  // ── Guard: no text → nothing to do ──────────────────────────────────────
  if (!text?.trim()) {
    safeEnd();
    return;
  }

  // ── No audio blob → run synthetic fallback ───────────────────────────────
  if (!audioBlob || audioBlob.size === 0) {
    console.warn('[TTS] No audio blob – using synthetic viseme animation.');
    lipSyncState.active = true;

    const duration    = Math.max(_visemeTimeline.duration, text.trim().length * 0.08, 1.5);
    const _synthStart = performance.now();

    const synthTick = () => {
      if (!lipSyncState.active) return;
      const t = (performance.now() - _synthStart) / 1000;
      if (t >= duration) { safeEnd(); return; }

      // Viseme state from the timeline (purely text-driven)
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

  // ── Real audio path ─────────────────────────────────────────────────────
  const ctx = ensureAudioContext();

  // Resume AudioContext if suspended (autoplay policy).
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Stop any previous source before setting up a new one.
  stopCurrentSource();

  // ── Decode the audio Blob into an AudioBuffer ────────────────────────────
  let audioBuffer;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    audioBuffer       = await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error('[TTS] decodeAudioData failed:', err);
    safeEnd();
    return;
  }

  // ── Build a fresh per-play pipeline ─────────────────────────────────────
  const source   = ctx.createBufferSource();
  source.buffer  = audioBuffer;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;  // increased from 256 for better frequency resolution

  source.connect(analyser);
  analyser.connect(ctx.destination);

  _currentSource = source;

  // ── Record playback start time ───────────────────────────────────────────
  const audioStartTime = ctx.currentTime;

  // ── Start the viseme tracking loop ───────────────────────────────────────
  lipSyncState.active = true;
  resetLipSyncState();
  startAnalysisLoop(analyser, audioStartTime);

  // ── Wire end-of-playback callback ────────────────────────────────────────
  source.onended = safeEnd;

  // ── Play! ─────────────────────────────────────────────────────────────────
  source.start();
}

/**
 * Stop any in-progress audio immediately (e.g. user interrupted).
 */
export function stopTTS() {
  lipSyncState.active = false;
  resetLipSyncState();
  stopAnalysisLoop();
  stopCurrentSource();
}

/**
 * Warm the AudioContext after the first user gesture so the very first real
 * utterance plays without delay.  Call this inside a click/keydown handler.
 */
export function warmAudio() {
  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => { /* fine – just warming */ });
  }
}
