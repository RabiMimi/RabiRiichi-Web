import React from 'react';
import { useRoom, useSelf } from '../state/store';
import { ActionHUD } from './ActionHUD';
import { getScreenPosition } from '../scene/seat';

export function GamePlayHUD(): React.JSX.Element | null {
  const room = useRoom();
  const currentUser = useSelf();

  if (!room?.info || !currentUser) {
    return null;
  }

  const { currentPlayer } = room.info;
  const selfPlayer = room.players.find((p) => p.id === currentUser.id);
  const selfSeat = selfPlayer?.seat;

  if (selfSeat === undefined) {
    return null;
  }

  const playerCount = room.config?.playerCount ?? 2;

  return (
    <div className="game-play-hud">
      {/* 2D Action HUD overlay buttons */}
      <ActionHUD />

      {/* Floating score panel for each player */}
      <div className="scoreboard">
        {room.players.map((player) => {
          if (player.seat === undefined) return null;
          const isTurn = player.seat === currentPlayer;
          const points =
            player.gameState?.points ??
            room.config?.pointThreshold?.initialPoints ??
            25000;
          const screenPos = getScreenPosition(
            player.seat,
            selfSeat,
            playerCount,
          );

          // Position labels: pos-0 is bottom (self), others are opponents
          let positionLabel = '对家 / Opponent';
          if (screenPos === 0) {
            positionLabel = '自己 / You';
          } else if (playerCount === 4) {
            if (screenPos === 1) positionLabel = '下家 / Right';
            if (screenPos === 2) positionLabel = '对家 / Opposite';
            if (screenPos === 3) positionLabel = '上家 / Left';
          }

          return (
            <div
              key={player.id}
              className={`score-card pos-${screenPos} ${isTurn ? 'active-turn' : ''}`}
            >
              <div className="score-card-header">
                <span className="player-nickname">{player.nickname}</span>
                <span className="player-pos-label">{positionLabel}</span>
              </div>
              <div className="player-points">{points}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
