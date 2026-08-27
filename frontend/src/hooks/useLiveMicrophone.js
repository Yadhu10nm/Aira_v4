import { useEffect, useRef, useState } from 'react';

const liveMicModule = import('../modules/mic.js');

export function useLiveMicrophone() {
  const [microphone, setMicrophone] = useState({ status: 'off', note: 'Microphone off' });
  const micModuleRef = useRef(null);

  useEffect(() => {
    let active = true;
    let micModule;

    liveMicModule.then((loadedModule) => {
      micModule = loadedModule;
      micModuleRef.current = loadedModule;
      loadedModule.setMicStatusHandler((status) => {
        if (active) setMicrophone((current) => ({ ...current, status }));
      });
    });

    return () => {
      active = false;
      micModule?.setMicStatusHandler(null);
      micModule?.stopLiveListening();
      micModuleRef.current = null;
    };
  }, []);

  const setEnabled = async (enabled) => {
    const loadedModule = micModuleRef.current ?? await liveMicModule;
    micModuleRef.current = loadedModule;
    if (!loadedModule) return;
    if (enabled) await loadedModule.startLiveListening();
    else await loadedModule.stopLiveListening();
  };

  return {
    isListening: microphone.status !== 'off' && microphone.status !== 'error',
    status: microphone.status,
    setEnabled,
  };
}