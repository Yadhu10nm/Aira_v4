import { useEffect } from 'react';
import LiveMicrophone from './components/Microphone/LiveMicrophone.jsx';

function App() {
  useEffect(() => {
    let disposed = false;
    let engine = null;

    import('./engine.js').then((loadedEngine) => {
      engine = loadedEngine;
      if (!disposed) loadedEngine.startEngine();
      else loadedEngine.stopEngine();
    });

    return () => {
      disposed = true;
      engine?.stopEngine();
    };
  }, []);

  return (
    <>
      <div id="stage">
        <div className="bracket tl" />
        <div className="bracket tr" />
        <div className="bracket bl" />
        <div className="bracket br" />
        <div id="status">
          <span className="dot" />
          <span className="label">STANDBY</span>
        </div>
        <div id="mark" className="mono">Aira</div>
      </div>

      <div id="overlay">
        <div className="box">
          <div className="title mono">Loading</div>
          <div className="msg mono" id="overlay-msg">Reading /models/Aira.vrm ...</div>
          <div className="bar"><i id="overlay-bar" /></div>
        </div>
      </div>

      <div id="mic-note" />
      <LiveMicrophone />
    </>
  );
}

export default App;