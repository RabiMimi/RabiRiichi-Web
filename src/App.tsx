import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SpinningCube } from './scene/SpinningCube.tsx';
import { initRabiRiichi } from './net/client';
import { useConnectionStatus, useSelf, useRoom } from './state/store';
import { ConnectScreen } from './ui/ConnectScreen';
import { LobbyScreen } from './ui/LobbyScreen';
import { RoomScreen } from './ui/RoomScreen';
import './App.css';

function App(): React.JSX.Element {
  const connectionStatus = useConnectionStatus();
  const currentUser = useSelf();
  const room = useRoom();

  useEffect(() => {
    void initRabiRiichi();
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
    return null;
  };

  return (
    <div className="app">
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <SpinningCube />
        <gridHelper args={[10, 10]} />
        <OrbitControls />
      </Canvas>
      {renderUI()}
    </div>
  );
}

export default App;
