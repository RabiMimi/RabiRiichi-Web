import React from 'react';
import { useRoom, useSelf, useAnimationSpeed } from '../state/store';
import { ActionHUD } from './ActionHUD';
import { rabiriichi } from '../net/client';

export function GamePlayHUD(): React.JSX.Element | null {
  const room = useRoom();
  const currentUser = useSelf();
  const animationSpeed = useAnimationSpeed();

  if (!room?.info || !currentUser) {
    return null;
  }

  const selfPlayer = room.players.find((p) => p.id === currentUser.id);
  const selfSeat = selfPlayer?.seat;

  if (selfSeat === undefined) {
    return null;
  }

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

      {/* 2D Action HUD overlay buttons */}
      <ActionHUD />
    </div>
  );
}
