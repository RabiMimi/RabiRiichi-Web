import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GameTable } from './scene/GameTable';
import { initRabiRiichi } from './net/client';
import { useConnectionStatus, useSelf, useRoom } from './state/store';
import { ConnectScreen } from './ui/ConnectScreen';
import { LobbyScreen } from './ui/LobbyScreen';
import { RoomScreen } from './ui/RoomScreen';
import { GamePlayHUD } from './ui/GamePlayHUD';
import { ResultPanel } from './ui/ResultPanel';
import './App.css';

function App(): React.JSX.Element {
  const connectionStatus = useConnectionStatus();
  const currentUser = useSelf();
  const room = useRoom();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('replay') === '1') {
      import('./dev/replayDriver')
        .then(({ startReplay }) => {
          void startReplay();
        })
        .catch(console.error);
    } else {
      void initRabiRiichi();
    }
  }, []);

  const renderUI = () => {
    if (connectionStatus !== 'connected' || !currentUser) {
      return <ConnectScreen />;
    }
    if (!room) {
      return <LobbyScreen />;
    }
    if (!room.info) {
      return <RoomScreen />;
    }
    return (
      <>
        <GamePlayHUD />
        <ResultPanel />
      </>
    );
  };

  return (
    <div className="app">
      <Canvas camera={{ position: [0, 4.5, 5], fov: 50 }}>
        <GameTable />
        <OrbitControls
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>
      {renderUI()}
    </div>
  );
}

export default App;
