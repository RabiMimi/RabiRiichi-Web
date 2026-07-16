import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { GameTable } from './scene/GameTable';
import { initRabiRiichi, rabiriichi } from './net/client';
import { preloadAllTileImages } from './scene/assets';
import {
  useConnectionStatus,
  useSelf,
  useRoom,
  useIsCameraLocked,
  useIsReplay,
  useIsSettingsOpen,
  setSettingsOpen,
} from './state/store';
import { ConnectScreen } from './ui/ConnectScreen';
import { LobbyScreen } from './ui/LobbyScreen';
import { RoomScreen } from './ui/RoomScreen';
import { GamePlayHUD } from './ui/GamePlayHUD';
import { ReplayHUD } from './ui/ReplayHUD';
import { startReplay, stopReplay } from './replay/replayDriver';
import { ResultPanel } from './ui/ResultPanel';
import { OrientationGuard } from './ui/OrientationGuard';
import { FullscreenButton } from './ui/FullscreenButton';
import { StickerPanel } from './ui/StickerPanel';
import { Tooltip } from './ui/Tooltip';
import { IconButton } from './ui/IconButton';
import { SettingsButton } from './ui/SettingsButton';
import { SettingsModal } from './ui/SettingsModal';
import { COMMIT_HASH } from './lib';
import type { PlayerModel, RoomModel } from './domain/model';
import type { ActionOption } from './domain/inquiry';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

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

function tryDiscardPendingTile(
  room: RoomModel | null,
  currentUser: PlayerModel | null,
) {
  if (!room || !currentUser) return;
  const selfPlayer = room.players.find((p) => p.id === currentUser.id);
  const pendingTile = selfPlayer?.gameState?.hand.pendingTile;
  if (!pendingTile) return;

  const playTile = rabiriichi.currentInquiry?.mapped.playTile;
  if (
    playTile &&
    pendingTile.traceId != null &&
    playTile.legalTiles.includes(pendingTile.traceId)
  ) {
    const activeOpt: ActionOption = {
      type: 'play-tile' as const,
      label: '打',
      actionIndex: playTile.actionIndex,
      legalTiles: playTile.legalTiles,
      ...(playTile.candidates ? { candidates: playTile.candidates } : {}),
    };
    void rabiriichi.submitInquiryResponse(activeOpt, pendingTile.traceId);
  }
}

function App(): React.JSX.Element {
  const { t } = useTranslation();
  const connectionStatus = useConnectionStatus();
  const currentUser = useSelf();
  const room = useRoom();
  const isCameraLocked = useIsCameraLocked();
  const isReplay = useIsReplay();
  const isSettingsOpen = useIsSettingsOpen();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const lastMissedRef = useRef<number>(0);

  const handlePointerMissed = () => {
    // Clear selection
    rabiriichi.selectTile(null);

    // Double click/tap check
    const now = Date.now();
    const diff = now - lastMissedRef.current;
    lastMissedRef.current = now;

    if (diff < 300) {
      tryDiscardPendingTile(room, currentUser);
    }
  };

  useEffect(() => {
    void preloadAllTileImages();
    const params = new URLSearchParams(window.location.search);
    let active = true;
    let stopReplayFn: (() => void) | null = null;

    if (params.get('replay') === '1') {
      import('./dev/fixtures/full_game.json')
        .then(({ default: replayData }) => {
          if (active) {
            stopReplayFn = stopReplay;
            void startReplay(replayData);
          }
        })
        .catch(console.error);
    } else {
      void initRabiRiichi();
    }

    return () => {
      active = false;
      // Note: intentionally NOT calling rabiriichi.close() here. `rabiriichi`
      // is a module-level singleton meant to live for the whole app session,
      // not per-mount. In dev, React.StrictMode mounts this effect, cleans it
      // up, then re-mounts it once to surface effect bugs - closing the
      // socket here would abort the in-flight reconnect handshake started by
      // initRabiRiichi() and this cleanup only race with itself.
      if (stopReplayFn) {
        stopReplayFn();
      }
    };
  }, []);

  const renderUI = () => {
    if (connectionStatus !== 'connected' || !currentUser) {
      return <ConnectScreen />;
    }
    if (isReplay) {
      return (
        <>
          <ReplayHUD />
          <ResultPanel />
        </>
      );
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
        onPointerMissed={handlePointerMissed}
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
      {!room?.info && (
        <>
          <FullscreenButton className="absolute top-5 left-5 z-[150] pointer-events-auto" />
          <div className="absolute top-5 right-5 z-[150] pointer-events-auto flex items-center gap-2">
            <span className="self-center text-xs text-[#888] font-mono whitespace-nowrap select-text">
              {t('lobby.build', { commit: COMMIT_HASH })}
            </span>
            <Tooltip content={t('lobby.clientRepo')} position="bottom">
              <IconButton
                as="a"
                variant="client"
                href="https://github.com/RabiMimi/RabiRiichi-Web"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="20"
                    height="20"
                    fill="currentColor"
                    style={{ display: 'block' }}
                  >
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 2.68.91 0 .65.01 1.23.01 1.39 0 .21-.15.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8z" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 text-[0.58rem] font-extrabold rounded-[3px] px-0.75 py-0.25 leading-none uppercase shadow-[0_1px_4px_rgba(0,0,0,0.5)] font-sans bg-[#ff7a99] text-white">
                    C
                  </span>
                </div>
              </IconButton>
            </Tooltip>
            <Tooltip content={t('lobby.serverRepo')} position="bottom">
              <IconButton
                as="a"
                variant="server"
                href="https://github.com/RabiMimi/RabiRiichi"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="20"
                    height="20"
                    fill="currentColor"
                    style={{ display: 'block' }}
                  >
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 2.68.91 0 .65.01 1.23.01 1.39 0 .21-.15.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8z" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 text-[0.58rem] font-extrabold rounded-[3px] px-0.75 py-0.25 leading-none uppercase shadow-[0_1px_4px_rgba(0,0,0,0.5)] font-sans bg-[#80deea] text-[#111]">
                    S
                  </span>
                </div>
              </IconButton>
            </Tooltip>

            <SettingsButton />
          </div>
        </>
      )}
      {room && <StickerPanel />}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

export default App;
