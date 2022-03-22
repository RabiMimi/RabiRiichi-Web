import React, { useEffect } from 'react';
import './App.css';
import AppInit, { AppInitWorkerInstance } from './component/AppInit';

function App() {
  useEffect(() => {
    void AppInitWorkerInstance.start();
  }, []);
  return (
    <div className="App">
      <AppInit worker={AppInitWorkerInstance} />
    </div>
  );
}

export default App;
