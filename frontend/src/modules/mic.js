/*
   MIC - live microphone monitoring and utterance capture.

   The backend accepts complete audio/webm uploads at /voice. The analyser
   decides when to start and finish each MediaRecorder utterance; it does not
   send analyser frames to the backend.
*/

import { setState, setMicNote } from './state.js';
import { triggerEmotion, resetToNeutral } from '../expressions/index.js';

const BACKEND_URL = 'http://localhost:8000/voice';
const TTS_URL = 'http://localhost:8000/tts';

export const VAD_THRESHOLD = 0.035;
export const SILENCE_DURATION = 800;
export const MIN_SPEECH_DURATION = 250;
const VAD_FRAME_MS = 50;

let stream = null;
let audioContext = null;
let analyser = null;
let mediaRecorder = null;
let audioChunks = [];
let vadFrameId = null;
let silenceStartedAt = null;
let speechStartedAt = null;
let listening = false;
let recording = false;
let processing = false;
let micReady = false;
let discardNextRecording = false;
let onStatus = null;

let _isSpeaking = false;
export const speakingGuard = {
  set isSpeaking(value) { _isSpeaking = value; },
  get isSpeaking() { return _isSpeaking; },
};

export let onResult = null;
export function setOnResult(handler) { onResult = handler; }
export function setMicStatusHandler(handler) { onStatus = handler; }

function status(nextStatus, note) {
  onStatus?.(nextStatus);
  if (nextStatus === 'listening' || nextStatus === 'speaking') setState('listening');
  if (nextStatus === 'processing') setState('processing');
  if (nextStatus === 'error' || nextStatus === 'off') setState('idle');
  if (note) setMicNote(note);
}

function recorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  return '';
}

export async function startLiveListening() {
  if (listening) return true;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || typeof AudioContext === 'undefined') {
    status('error', 'Live microphone is not supported by this browser.');
    return false;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 16000 },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.7;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    await audioContext.resume();
    listening = true;
    micReady = true;
    status('listening', 'Listening for speech...');
    monitorVoice();
    return true;
  } catch (error) {
    console.error('[MIC] Live microphone setup failed:', error);
    await stopLiveListening();
    status('error', 'Microphone access was denied or unavailable.');
    return false;
  }
}

function monitorVoice() {
  if (!listening || !analyser) return;
  const samples = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const volume = Math.sqrt(sum / samples.length);
  const now = performance.now();

  if (!processing && !_isSpeaking) {
    if (!recording && volume >= VAD_THRESHOLD) {
        beginUtterance(now);
    } else if (recording && volume < VAD_THRESHOLD) {
      silenceStartedAt ??= now;
      if (now - silenceStartedAt >= SILENCE_DURATION) finishUtterance(now);
    } else if (recording) {
      silenceStartedAt = null;
    }
  }

  vadFrameId = window.setTimeout(monitorVoice, VAD_FRAME_MS);
}

function beginUtterance(now) {
  const mimeType = recorderMimeType();
  if (!mimeType) {
    status('error', 'This browser cannot record audio/webm.');
    return;
  }
  try {
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const chunks = audioChunks.slice();
      audioChunks = [];
      if (discardNextRecording) {
        discardNextRecording = false;
        return;
      }
      handleUtterance(chunks);
    };
    mediaRecorder.onerror = (event) => {
      console.error('[MIC] MediaRecorder failed:', event.error);
      recording = false;
      status('error', 'Microphone recording failed.');
    };
    mediaRecorder.start();
    recording = true;
    speechStartedAt = now;
    silenceStartedAt = null;
    document.body.classList.add('recording');
    status('speaking', 'Listening / speaking...');
  } catch (error) {
    console.error('[MIC] Could not start MediaRecorder:', error);
    status('error', 'Microphone recording failed.');
  }
}

function finishUtterance(now) {
  if (!recording || !mediaRecorder) return;
  if (now - speechStartedAt < MIN_SPEECH_DURATION) {
    recording = false;
    silenceStartedAt = null;
    discardNextRecording = true;
    document.body.classList.remove('recording');
    mediaRecorder.stop();
    mediaRecorder = null;
    status('listening', 'Listening for speech...');
    return;
  }
  recording = false;
  silenceStartedAt = null;
  document.body.classList.remove('recording');
  mediaRecorder.stop();
  mediaRecorder = null;
  processing = true;

  // Natural reaction: thoughtful contemplation while waiting for AI reply
  triggerEmotion('thinking', 0.85);
  status('processing', 'Processing...');
}

async function handleUtterance(chunks) {
  const audioBlob = new Blob(chunks, { type: 'audio/webm' });
  audioChunks = [];
  if (audioBlob.size === 0) {
    processing = false;
    resetToNeutral();
    status('listening', 'Listening for speech...');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const response = await fetch(BACKEND_URL, { method: 'POST', body: formData });
    if (!response.ok) throw new Error(`Backend responded with ${response.status}`);
    const data = await response.json();
    const reply = data?.response ?? null;
    const userText = data?.user_text ?? '';
    const layaDecision = data?.laya ?? null;

    if (!reply) {
      processing = false;
      resetToNeutral();
      status('listening', "Didn't catch that - keep speaking when ready.");
      return;
    }

    let ttsAudioBlob = null;
    try {
      const ttsResponse = await fetch(TTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply }),
      });
      if (!ttsResponse.ok) throw new Error(`TTS backend responded with ${ttsResponse.status}`);
      ttsAudioBlob = await ttsResponse.blob();
    } catch (error) {
      console.error('[MIC] Failed to get TTS audio:', error);
    }

    onResult?.(reply, ttsAudioBlob, userText, layaDecision);
  } catch (error) {
    console.error('[MIC] Backend request failed:', error);
    resetToNeutral();
    status(listening ? 'error' : 'off', listening ? 'Backend error. Listening will resume.' : 'Microphone off');
  }

  processing = false;
  if (listening && !_isSpeaking) status('listening', 'Listening for speech...');
}

export function setMicSuppressed(suppressed) {
  processing = suppressed;
  if (suppressed && recording && mediaRecorder) {
    recording = false;
    discardNextRecording = true;
    document.body.classList.remove('recording');
    mediaRecorder.stop();
    mediaRecorder = null;
  }
}

export async function stopLiveListening() {
  listening = false;
  processing = false;
  recording = false;
  micReady = false;
  if (vadFrameId !== null) {
    window.clearTimeout(vadFrameId);
    vadFrameId = null;
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  discardNextRecording = true;
  mediaRecorder = null;
  audioChunks = [];
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  analyser?.disconnect();
  analyser = null;
  if (audioContext) await audioContext.close().catch(() => {});
  audioContext = null;
  document.body.classList.remove('recording');
  status('off', 'Microphone off');
}

export function isLiveListening() { return listening; }

status('off', 'Microphone off');