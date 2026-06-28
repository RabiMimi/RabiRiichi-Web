import React from 'react';
import {
  useRoom,
  useSelf,
  useAnimationSpeed,
  useActionTimeout,
  useCurrentInquiry,
} from '../state/store';
import { ActionHUD } from './ActionHUD';
import { rabiriichi } from '../net/client';
import { Tile } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';

function DoraPanel(): React.JSX.Element | null {
  const room = useRoom();
  if (!room?.info) return null;

  const { doras } = room.info;

  return (
    <div className="dora-panel">
      <div className="dora-panel-title">宝牌 / DORA</div>
      <div className="dora-tiles-row">
        {Array.from({ length: 5 }).map((_, idx) => {
          const doraTileMsg = doras && idx < doras.length ? doras[idx] : null;
          let imgSrc = '/assets/hand_tiles/back.jpg';

          if (doraTileMsg && doraTileMsg.tile) {
            const tileStr = Tile.fromByte(doraTileMsg.tile).toString();
            imgSrc = getTileTexturePath(tileStr);
          }

          return (
            <img
              key={idx}
              src={imgSrc}
              alt={doraTileMsg ? 'Dora' : 'Locked'}
              className="dora-tile-img"
            />
          );
        })}
      </div>
    </div>
  );
}

export function GamePlayHUD(): React.JSX.Element | null {
  const room = useRoom();
  const currentUser = useSelf();
  const animationSpeed = useAnimationSpeed();
  const actionTimeout = useActionTimeout();

  const currentInquiry = useCurrentInquiry();

  if (!room?.info || !currentUser) {
    return null;
  }

  const selfPlayer = room.players.find((p) => p.id === currentUser.id);
  const selfSeat = selfPlayer?.seat;

  if (selfSeat === undefined) {
    return null;
  }

  const hasPlayTile = currentInquiry?.mapped.playTile != null;
  const timerLabel = hasPlayTile ? '请出牌 / DISCARD' : '请选择 / ACTION';

  return (
    <div className="game-play-hud">
      {/* Settings Panel */}
      <div
        className="settings-panel"
        style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
      >
        <label
          htmlFor="speed-select"
          style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#aaa' }}
        >
          动画速度 / Speed
        </label>
        <select
          id="speed-select"
          value={animationSpeed}
          onChange={(e) => rabiriichi.setAnimationSpeed(Number(e.target.value))}
          style={{
            background: '#222',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="0.25">x0.25</option>
          <option value="0.5">x0.5</option>
          <option value="1">x1.0</option>
          <option value="2">x2.0</option>
          <option value="4">x4.0</option>
          <option value="8">x8.0</option>
        </select>
      </div>

      {/* Dora Panel */}
      <DoraPanel />

      {/* Fancy Turn Countdown (visible when player has a pending action inquiry) */}
      {currentInquiry && actionTimeout > 0 && (
        <div className="player-timer-overlay">
          <span className="timer-label">{timerLabel}</span>
          <span className="timer-seconds">{actionTimeout}</span>
        </div>
      )}

      {/* 2D Action HUD overlay buttons */}
      <ActionHUD />
    </div>
  );
}
