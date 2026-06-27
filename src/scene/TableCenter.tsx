import React, { useEffect } from 'react';
import { useTexture, Text as DreiText } from '@react-three/drei';
import * as THREE from 'three';
import { useRoom, useSelf } from '../state/store';
import { getScreenPosition, getSeatRotation } from './seat';
import { getTableMidTexturePath, ROBOTO_FONT_PATH } from './assets';

export function TableCenter(): React.JSX.Element | null {
  const room = useRoom();
  const currentUser = useSelf();

  // Load textures
  const bgTexture = useTexture(getTableMidTexturePath('bg'));
  const activeTexture = useTexture(getTableMidTexturePath('box_color'));
  const windE = useTexture(getTableMidTexturePath('feng_E'));
  const windS = useTexture(getTableMidTexturePath('feng_S'));
  const windW = useTexture(getTableMidTexturePath('feng_W'));
  const windN = useTexture(getTableMidTexturePath('feng_N'));

  // Configure textures
  useEffect(() => {
    [bgTexture, activeTexture, windE, windS, windW, windN].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
    });
  }, [bgTexture, activeTexture, windE, windS, windW, windN]);

  if (!room?.info || !currentUser) {
    return null;
  }

  const { round, currentPlayer, remainingTiles } = room.info;
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

  // Round wind texture (East = rounds 0-3, South = rounds 4-7, West = 8-11, North = 12-15)
  const roundWindIdx = Math.floor(round / 4) % 4;
  const windTexture = [windE, windS, windW, windN][roundWindIdx] ?? windE;

  const roundNum = (round % 4) + 1;

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

      {/* Active player indicator bar */}
      <group rotation={[0, -activeRotation, 0]}>
        <mesh position={[0, 0.001, 0.48]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 0.12]} />
          <meshBasicMaterial
            map={activeTexture}
            transparent
            blending={THREE.AdditiveBlending}
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Round Wind Indicator */}
      <mesh position={[-0.15, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshBasicMaterial map={windTexture} transparent />
      </mesh>

      {/* Round Number (e.g. East "1") */}
      <DreiText
        position={[0.15, 0.003, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={ROBOTO_FONT_PATH}
      >
        {roundNum}
      </DreiText>

      {/* Remaining tiles indicator */}
      <DreiText
        position={[0, 0.003, 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.1}
        color="#ffcc00"
        anchorX="center"
        anchorY="middle"
        font={ROBOTO_FONT_PATH}
      >
        {remainingTiles}
      </DreiText>
    </group>
  );
}

// Pre-load textures
useTexture.preload(getTableMidTexturePath('bg'));
useTexture.preload(getTableMidTexturePath('box_color'));
useTexture.preload(getTableMidTexturePath('feng_E'));
useTexture.preload(getTableMidTexturePath('feng_S'));
useTexture.preload(getTableMidTexturePath('feng_W'));
useTexture.preload(getTableMidTexturePath('feng_N'));
