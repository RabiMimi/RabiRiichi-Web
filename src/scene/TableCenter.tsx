import React, { useEffect, useRef, useState } from 'react';
import { useTexture, Text as DreiText } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useRoom,
  useSelf,
  useActionTimeout,
  useTimerActiveSeat,
} from '../state/store';
import { getScreenPosition, getSeatRotation } from './seat';
import { getTableMidTexturePath, TABLE_CENTER_FONT_PATH } from './assets';

export function TableCenter(): React.JSX.Element | null {
  const room = useRoom();
  const currentUser = useSelf();
  const actionTimeout = useActionTimeout();
  const timerActiveSeat = useTimerActiveSeat();
  const [isHovered, setIsHovered] = useState(false);

  // Load textures
  const bgTexture = useTexture(getTableMidTexturePath('bg'));
  const activeTexture = useTexture(getTableMidTexturePath('box_color_white'));
  const riichiTexture = useTexture(getTableMidTexturePath('box_color'));

  // Configure textures
  useEffect(() => {
    [bgTexture, activeTexture, riichiTexture].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    });
  }, [bgTexture, activeTexture, riichiTexture]);

  if (!room?.info || !currentUser) {
    return null;
  }

  const { round, currentPlayer, remainingTiles, dealer } = room.info;
  const selfPlayer = room.players.find((p) => p.id === currentUser.id);
  const selfSeat = selfPlayer?.seat;

  if (selfSeat === undefined) {
    return null;
  }

  const playerCount = room.config?.playerCount ?? 2;

  // Calculate which screen position is active (current turn)
  const activeScreenPos = getScreenPosition(
    currentPlayer,
    selfSeat,
    playerCount,
  );
  const activeRotation = getSeatRotation(activeScreenPos);

  // Round wind texture (East = 0, South = 1, West = 2, North = 3)
  const windTexts = ['東', '南', '西', '北'];
  const roundWindIdx = round % 4;
  // Round wind character (场风 = red)
  const roundWindText = windTexts[roundWindIdx] ?? '東';

  const roundNum = dealer + 1;

  return (
    // Slightly elevated above table top (y=0) to prevent z-fighting
    <group position={[0, 0.005, 0]}>
      {/* Center Plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial
          map={bgTexture}
          transparent
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Active player turn indicator with blink */}
      <group rotation={[0, activeRotation, 0]}>
        <BlinkIndicator texture={activeTexture} />
      </group>

      {/* Round: 東1局 — wind in red, number+局 in gray */}
      <DreiText
        position={[-0.06, 0.001, -0.08]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.11}
        color="#02B6BF"
        anchorX="right"
        anchorY="middle"
        font={TABLE_CENTER_FONT_PATH}
        renderOrder={2}
      >
        {roundWindText}
      </DreiText>
      <DreiText
        position={[-0.05, 0.004, -0.08]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.11}
        color="#02B6BF"
        anchorX="left"
        anchorY="middle"
        font={TABLE_CENTER_FONT_PATH}
        renderOrder={2}
      >
        {roundNum}
      </DreiText>
      <DreiText
        position={[0.1, 0.004, -0.08]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.11}
        color="#02B6BF"
        anchorX="center"
        anchorY="middle"
        font={TABLE_CENTER_FONT_PATH}
        renderOrder={2}
      >
        局
      </DreiText>

      {/* Remaining: 佘XX */}
      <DreiText
        position={[0, 0.004, 0.12]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.09}
        color="#02B6BF"
        anchorX="center"
        anchorY="middle"
        font={TABLE_CENTER_FONT_PATH}
        renderOrder={2}
      >
        {`余${remainingTiles}`}
      </DreiText>

      {/* Render score, seat wind, and Riichi sticks for each player */}
      {room.players.map((p) => {
        if (p.seat === undefined) return null;
        const screenPos = getScreenPosition(p.seat, selfSeat, playerCount);
        const rotY = getSeatRotation(screenPos);

        const seatWindIdx = (p.seat - dealer + playerCount) % playerCount;
        const seatWindText = windTexts[seatWindIdx] ?? '東';

        const points =
          p.gameState?.points ??
          room.config?.pointThreshold?.initialPoints ??
          25000;

        const isTimerActive = timerActiveSeat === p.seat && actionTimeout > 0;
        const isRiichi = p.gameState?.isRiichiConfirmed ?? false;

        const selfPlayerObj = room.players.find((sp) => sp.seat === selfSeat);
        const selfPoints =
          selfPlayerObj?.gameState?.points ??
          room.config?.pointThreshold?.initialPoints ??
          25000;

        let displayText = points.toString();
        let displayColor = '#ffffff';

        if (isHovered && p.seat !== selfSeat) {
          const diff = selfPoints - points;
          if (diff > 0) {
            displayText = `+${diff}`;
            displayColor = '#00ff66';
          } else if (diff < 0) {
            displayText = `${diff}`;
            displayColor = '#ff3366';
          } else {
            displayText = '0';
            displayColor = '#ffffff';
          }
        }

        return (
          <group key={p.id} rotation={[0, rotY, 0]}>
            {/* Score Text (centered horizontally, pushed inwards to avoid lines) */}
            <DreiText
              position={[0, 0.004, 0.3]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.1}
              color={displayColor}
              anchorX="center"
              anchorY="middle"
              font={TABLE_CENTER_FONT_PATH}
              renderOrder={2}
              onPointerOver={(e) => {
                e.stopPropagation();
                setIsHovered(true);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setIsHovered(false);
              }}
            >
              {displayText}
            </DreiText>

            {/* Seat Wind Text — 庄家用红色 */}
            <DreiText
              position={[-0.45, 0.004, 0.45]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.11}
              color={p.seat === dealer ? '#FF5454' : '#BFBFBF'}
              anchorX="center"
              anchorY="middle"
              font={TABLE_CENTER_FONT_PATH}
              renderOrder={2}
            >
              {seatWindText}
            </DreiText>

            {/* Riichi Stick (placed flat in front of their discard river) */}
            {isRiichi && (
              <mesh
                position={[0, 0.003, 0.62]}
                rotation={[-Math.PI / 2, 0, 0]}
                renderOrder={2}
              >
                <planeGeometry args={[0.55, 0.09]} />
                <meshBasicMaterial
                  map={riichiTexture}
                  transparent
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Active-turn indicator that blinks between 100% and 80% opacity in a 2s loop. */
function BlinkIndicator({ texture }: { texture: THREE.Texture }): React.JSX.Element {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = (clock.getElapsedTime() % 2) / 2;
    // Sine wave oscillating between 0.8 and 1.0
    matRef.current.opacity = 0.9 + 0.1 * Math.sin(t * Math.PI * 2);
  });

  return (
    <mesh
      position={[0, 0.002, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[1.16, 1.16]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// Pre-load textures
useTexture.preload(getTableMidTexturePath('bg'));
useTexture.preload(getTableMidTexturePath('box_color'));
useTexture.preload(getTableMidTexturePath('box_color_white'));
