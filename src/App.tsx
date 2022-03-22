import React, { useEffect, useState } from 'react';
import './App.css';
import AppInit, { AppInitWorkerInstance } from './component/AppInit';
import StartGameDialog, {
  StartGameDialogData,
} from './component/config/StartGameDialog';

enum AppState {
  Init,
  ConfigInput,
  Game,
}

function App() {
  useEffect(() => {
    void AppInitWorkerInstance.start();
  }, []);
  const [state, setState] = useState(AppState.Init);

  if (state === AppState.Init) {
    return (
      <AppInit
        data={AppInitWorkerInstance}
        onFinish={() => setState(AppState.ConfigInput)}
      />
    );
  } else if (state === AppState.ConfigInput) {
    return <StartGameDialog data={StartGameDialogData}></StartGameDialog>;
  }

  return <div className="App"></div>;
}

export default App;
