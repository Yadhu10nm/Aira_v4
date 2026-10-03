/* =========================================================================
   AIRA  –  ws.js (WebSocket Client for Real-Time Streaming & Avatar Events)
   ========================================================================= */

import { setState, setMicNote } from './state.js';
import { speakingGuard } from './mic.js';
import { playTTS, stopTTS } from './tts.js';
import { triggerHey } from './avatarAnimation.js';
import { triggerEmotion, triggerHumanReaction, resetToNeutral } from '../expressions/index.js';
import { clock } from './scene.js';

let socket = null;
let reconnectTimer = null;
let streamedReply = '';
let currentReplyText = '';

export function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || '127.0.0.1';
  const url = `${protocol}//${host}:8000/ws`;

  console.log(`[WS] Connecting to ${url}...`);
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log('[WS] Connected to Aira Backend.');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWsMessage(data);
    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
    }
  };

  socket.onclose = () => {
    console.warn('[WS] Disconnected. Reconnecting in 3 seconds...');
    scheduleReconnect();
  };

  socket.onerror = (err) => {
    console.error('[WS] Error:', err);
  };
}

function scheduleReconnect() {
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectWebSocket();
    }, 3000);
  }
}

async function handleWsMessage(data) {
  switch (data.type) {
    case 'connected':
      console.log(`[WS] Server ready: ${data.assistant}`);
      break;

    case 'generation_start':
      streamedReply = '';
      currentReplyText = '';
      setState('processing');
      setMicNote('Thinking...');
      triggerEmotion('thinking', 0.85);
      break;

    case 'assistant_text':
      if (data.is_chunk) {
        streamedReply += data.text;
        setMicNote(streamedReply);
      } else {
        currentReplyText = data.text;
        setMicNote(data.text);
      }
      break;

    case 'emotion':
      triggerHumanReaction(
        data.emotion || 'neutral',
        data.intensity ?? 0.88,
        data.duration ?? 1.5,
        data.soften_intensity ?? 0.25
      );
      break;

    case 'animation':
      if (data.animation === 'wave' || data.animation === 'hey') {
        triggerHey();
      }
      break;

    case 'tts_start':
      console.log('[WS] TTS Audio incoming...');
      break;

    case 'tts_audio':
      if (data.audio) {
        try {
          const binaryString = atob(data.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const audioBlob = new Blob([bytes.buffer], { type: 'audio/wav' });

          speakingGuard.isSpeaking = true;
          setState('speaking');

          await playTTS(
            currentReplyText || streamedReply,
            audioBlob,
            clock.elapsedTime,
            () => {
              speakingGuard.isSpeaking = false;
              setState('idle');
              setMicNote('Listening for speech...');
              setTimeout(() => {
                resetToNeutral();
              }, 800);
            }
          );
        } catch (audioErr) {
          console.error('[WS] Audio decoding failed:', audioErr);
        }
      }
      break;

    case 'tts_end':
      break;

    case 'generation_end':
      console.log('[WS] Generation completed.');
      break;

    case 'error':
      console.error('[WS] Backend error:', data.message);
      setMicNote(data.message || 'Error occurred');
      resetToNeutral();
      setState('idle');
      break;

    case 'cleared':
      setMicNote('Conversation memory reset.');
      break;

    default:
      console.log('[WS] Unhandled message:', data);
  }
}

export function sendUserMessage(text) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('[WS] Socket is not open.');
    return false;
  }
  socket.send(JSON.stringify({
    type: 'user_message',
    text: text
  }));
  return true;
}

export function clearMemory() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type: 'clear' }));
  return true;
}

if (typeof window !== 'undefined') {
  window.airaWsSend = sendUserMessage;
  window.airaWsClear = clearMemory;
  window.airaWsConnect = connectWebSocket;
}
