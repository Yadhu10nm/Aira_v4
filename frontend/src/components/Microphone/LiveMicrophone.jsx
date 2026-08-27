import { useLiveMicrophone } from '../../hooks/useLiveMicrophone.js';

function labelForStatus(status) {
  if (status === 'speaking') return 'Microphone: speaking';
  if (status === 'processing') return 'Microphone: processing';
  if (status === 'listening') return 'Microphone: listening';
  if (status === 'error') return 'Microphone: error';
  return 'Microphone: off';
}

export default function LiveMicrophone() {
  const { isListening, status, setEnabled } = useLiveMicrophone();

  return (
    <button
      id="mic-toggle"
      className={`mono mic-${status}`}
      type="button"
      aria-pressed={isListening}
      onClick={() => setEnabled(!isListening)}
    >
      <span aria-hidden="true">{isListening ? 'MIC ON' : 'MIC OFF'}</span>
      <span className="mic-status">{labelForStatus(status)}</span>
    </button>
  );
}