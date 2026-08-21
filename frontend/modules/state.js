/* =========================================================================
   STATE  –  app-state machine ('idle' | 'listening' | 'speaking') + UI labels
   ========================================================================= */

const statusEl   = document.getElementById('status');
const statusLabel = statusEl?.querySelector('.label');
const micNote    = document.getElementById('mic-note');

export let appState = 'idle';

export function setMicNote(text) {
  if (micNote) micNote.textContent = text;
}

export function setState(next) {
  appState = next;
  statusEl?.classList.remove('state-listening', 'state-speaking');

  if (next === 'listening') {
    statusEl?.classList.add('state-listening');
    if (statusLabel) statusLabel.textContent = 'LISTENING…';
  } else if (next === 'speaking') {
    statusEl?.classList.add('state-speaking');
    if (statusLabel) statusLabel.textContent = 'SPEAKING…';
  } else {
    if (statusLabel) statusLabel.textContent = 'STANDBY';
  }
}
