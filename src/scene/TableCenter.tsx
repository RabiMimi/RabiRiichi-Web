import React, { useEffect } from 'react';
import { useTexture, Text as DreiText, Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { AiType } from '../proto';
import { getPlayerDisplayName } from '../domain/model';
import {
  useRoom,
  useSelf,
  useActionTimeout,
  useTimerActiveSeat,
} from '../state/store';
import { getScreenPosition, getSeatRotation } from './seat';
import { getTableMidTexturePath, ROBOTO_FONT_PATH } from './assets';

export function TableCenter(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentUser = useSelf();
  const actionTimeout = useActionTimeout();
  const timerActiveSeat = useTimerActiveSeat();

  // Load textures
  const bgTexture = useTexture(getTableMidTexturePath('bg'));
  const activeTexture = useTexture(getTableMidTexturePath('box_color_white'));
  const riichiTexture = useTexture(getTableMidTexturePath('box_color'));
  const windE = useTexture(getTableMidTexturePath('feng_E'));
  const windS = useTexture(getTableMidTexturePath('feng_S'));
  const windW = useTexture(getTableMidTexturePath('feng_W'));
  const windN = useTexture(getTableMidTexturePath('feng_N'));

  // Configure textures
  useEffect(() => {
    [
      bgTexture,
      activeTexture,
      riichiTexture,
      windE,
      windS,
      windW,
      windN,
    ].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      // The wind glyphs are small NPOT (41x41) textures. Mipmapping averages
      // the sparse dark pixels with the transparent surround, dropping alpha so
      // the white plate behind shows through (the glyph "turns white"). Disable
      // mipmaps and use linear filtering so the glyph keeps its color/alpha.
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    });
  }, [bgTexture, activeTexture, riichiTexture, windE, windS, windW, windN]);

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

      {/* Active player turn indicator (small white dot from box_color_white texture scaled to z=0.56) */}
      <group rotation={[0, activeRotation, 0]}>
        <mesh
          position={[0, 0.002, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <planeGeometry args={[1.16, 1.16]} />
          <meshBasicMaterial
            map={activeTexture}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Round Wind Indicator (placed in left half of the white circle) */}
      <mesh
        position={[-0.08, 0.003, -0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <planeGeometry args={[0.15, 0.15]} />
        <meshBasicMaterial map={windTexture} transparent depthWrite={false} />
      </mesh>

      {/* Round Number (placed in right half of the white circle, dark color for contrast) */}
      <DreiText
        position={[0.08, 0.004, -0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
        font={ROBOTO_FONT_PATH}
        renderOrder={2}
      >
        {roundNum}
      </DreiText>

      {/* Remaining tiles indicator (centered inside the white circle, dark color for contrast) */}
      <DreiText
        position={[0, 0.004, 0.12]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.09}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
        font={ROBOTO_FONT_PATH}
        renderOrder={2}
      >
        {remainingTiles}
      </DreiText>

      {/* Render score, seat wind, and Riichi sticks for each player */}
      {room.players.map((p) => {
        if (p.seat === undefined) return null;
        const screenPos = getScreenPosition(p.seat, selfSeat, playerCount);
        const rotY = getSeatRotation(screenPos);

        const seatWindIdx = (p.seat - dealer + playerCount) % playerCount;
        const windTextures =
          playerCount === 2 ? [windE, windS] : [windE, windS, windW, windN];
        const seatWindTexture = windTextures[seatWindIdx] ?? windE;

        const points =
          p.gameState?.points ??
          room.config?.pointThreshold?.initialPoints ??
          25000;

        const isTimerActive = timerActiveSeat === p.seat && actionTimeout > 0;
        const isRiichi = p.gameState ? p.gameState.riichiTileId > 0 : false;

        return (
          <group key={p.id} rotation={[0, rotY, 0]}>
            {/* Score Text (centered horizontally, pushed inwards to avoid lines) */}
            <DreiText
              position={[0, 0.004, 0.32]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.07}
              color={isTimerActive ? '#ffcc00' : '#ffffff'}
              anchorX="center"
              anchorY="middle"
              font={ROBOTO_FONT_PATH}
              renderOrder={2}
            >
              {points}
            </DreiText>

            {/* Player Nameplate */}
            <Html
              position={[0, 0.004, 0.4]}
              rotation={[-Math.PI / 2, 0, 0]}
              transform
              occlude
              style={{
                pointerEvents: 'auto',
                userSelect: 'none',
              }}
            >
              <div className="player-plate-3d">
                <span className="player-name-3d">
                  {getPlayerDisplayName(p, t)}
                </span>
                {p.aiType !== AiType.AI_TYPE_NONE && (
                  <div
                    className="ai-indicator-gemini"
                    data-tooltip={t(`ai.type.${p.aiType}`)}
                  />
                )}
              </div>
            </Html>

            {/* Seat Wind Icon (shifted to the bottom-left corner on the white corner, larger display) */}
            <mesh
              position={[-0.45, 0.003, 0.45]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={2}
            >
              <planeGeometry args={[0.13, 0.13]} />
              <meshBasicMaterial
                map={seatWindTexture}
                transparent
                depthWrite={false}
              />
            </mesh>

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

// Pre-load textures
useTexture.preload(getTableMidTexturePath('bg'));
useTexture.preload(getTableMidTexturePath('box_color'));
useTexture.preload(getTableMidTexturePath('box_color_white'));
useTexture.preload(getTableMidTexturePath('feng_E'));
useTexture.preload(getTableMidTexturePath('feng_S'));
useTexture.preload(getTableMidTexturePath('feng_W'));
useTexture.preload(getTableMidTexturePath('feng_N'));
