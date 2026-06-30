import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GameTable } from './scene/GameTable';
import { initRabiRiichi } from './net/client';
import {
  useConnectionStatus,
  useSelf,
  useRoom,
  useIsCameraLocked,
} from './state/store';
import { ConnectScreen } from './ui/ConnectScreen';
import { LobbyScreen } from './ui/LobbyScreen';
import { RoomScreen } from './ui/RoomScreen';
import { GamePlayHUD } from './ui/GamePlayHUD';
import { ResultPanel } from './ui/ResultPanel';
import { OrientationGuard } from './ui/OrientationGuard';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import './App.css';

function CameraController({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();
  const isCameraLocked = useIsCameraLocked();

  useEffect(() => {
    const aspect = size.width / size.height;
    const k = Math.max(1.0, 1.77 / aspect);
    const yCam = 3.0 * k;
    const zCam = 2.42 + 0.98 * k;
    const zTarget = 2.42 - 1.83 * k;
    const defaultPos: [number, number, number] = [0, yCam, zCam];

    if (isCameraLocked) {
      camera.position.set(...defaultPos);
      camera.lookAt(0, 0, zTarget);
      camera.updateProjectionMatrix();
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, zTarget);
        controlsRef.current.update();
      }
    }
  }, [size.width, size.height, camera, isCameraLocked, controlsRef]);

  return null;
}

function App(): React.JSX.Element {
  const connectionStatus = useConnectionStatus();
  const currentUser = useSelf();
  const room = useRoom();
  const isCameraLocked = useIsCameraLocked();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let active = true;
    let stopReplayFn: (() => void) | null = null;

    if (params.get('replay') === '1') {
      import('./dev/replayDriver')
        .then(({ startReplay, stopReplay }) => {
          if (active) {
            stopReplayFn = stopReplay;
            void startReplay();
          }
        })
        .catch(console.error);
    } else {
      void initRabiRiichi();
    }

    return () => {
      active = false;
      if (stopReplayFn) {
        stopReplayFn();
      }
    };
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
      <OrientationGuard />
      <Canvas
        camera={{ position: [0, 3.0, 3.4], fov: 50 }}
        style={{ zIndex: 1 }}
      >
        <CameraController controlsRef={controlsRef} />
        <GameTable />
        <OrbitControls
          ref={controlsRef}
          enableRotate={!isCameraLocked}
          enableZoom={!isCameraLocked}
          enablePan={!isCameraLocked}
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
