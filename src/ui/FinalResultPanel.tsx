import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom, useCharacterId } from '../state/store';
import { getPlayerDisplayName } from '../domain/model';
import { AiType } from '../proto';
import { CHARACTERS } from '../domain/character';
import { Button } from './Button';
import { CopyGameIdButton } from './CopyGameIdButton';

interface FinalResultPanelProps {
  onReturnToRoom: () => void;
}

export function FinalResultPanel({
  onReturnToRoom,
}: FinalResultPanelProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const characterId = useCharacterId();
  const activeCharacter = React.useMemo(() => {
    const found = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
    if (!found) {
      throw new Error(
        `Character ${characterId} not found and no fallback available`,
      );
    }
    return found;
  }, [characterId]);

  const rankedPlayers = React.useMemo(() => {
    if (!room) return [];
    const basePlayers = room.concludedPlayers ?? room.players;
    const list = basePlayers.map((p) => {
      const seat = p.seat ?? 0;
      const points = room.endGamePoints?.[seat] ?? p.gameState?.points ?? 25000;
      return { player: p, points };
    });
    return list.sort((a, b) => b.points - a.points);
  }, [room]);

  if (!room) return null;

  return (
    <div className="result-overlay">
      <div className="result-layout-container">
        <div className="result-character-side">
          <img
            src={activeCharacter.visualUrl}
            alt={`${activeCharacter.id}-avatar`}
            className="result-mimi-side-art"
          />
        </div>
        <div className="result-panel final-results-panel">
          <div
            className="result-header"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'center',
            }}
          >
            <h2 className="result-title" style={{ margin: 0 }}>
              {t('result.finalTitle', 'Game Concluded')}
            </h2>
            {room.gameId && (
              <div
                className="final-game-id"
                style={{
                  color: '#aaa',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>
                  {t('hud.gameId')}: {room.gameId}
                </span>
                <CopyGameIdButton gameId={room.gameId} />
              </div>
            )}
          </div>

          <div className="result-content-scrollable">
            <div className="final-ranking-list">
              {rankedPlayers.map((item, index) => {
                const rank = index + 1;
                const displayName = getPlayerDisplayName(item.player, t);
                const initials =
                  item.player.aiType !== AiType.AI_TYPE_NONE
                    ? 'AI'
                    : displayName.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={item.player.id}
                    className={`final-rank-card rank-${rank}`}
                  >
                    <div className="rank-number">#{rank}</div>
                    <div className="rank-avatar">{initials}</div>
                    <div className="rank-details">
                      <span className="rank-name">{displayName}</span>
                      <span className="rank-points">{item.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="result-actions"
            style={{ flexDirection: 'row', gap: '12px' }}
          >
            <Button onClick={onReturnToRoom} className="w-full">
              {t('result.returnToRoom', 'Return to Room')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
