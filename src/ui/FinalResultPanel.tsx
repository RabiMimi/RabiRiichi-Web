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

  const rankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          card: 'border-[#ffd700] bg-[#ffd700]/10',
          number: 'text-[#ffd700]',
          avatar: 'border-[#ffd700]',
        };
      case 2:
        return {
          card: 'border-[#c0c0c0] bg-[#c0c0c0]/8',
          number: 'text-[#c0c0c0]',
          avatar: 'border-[#555]',
        };
      case 3:
        return {
          card: 'border-[#cd7f32] bg-[#cd7f32]/6',
          number: 'text-[#cd7f32]',
          avatar: 'border-[#555]',
        };
      default:
        return {
          card: 'border-[#3d3d3d] bg-[#2a2a2a]',
          number: 'text-[#888]',
          avatar: 'border-[#555]',
        };
    }
  };

  if (!room) return null;

  return (
    <div className="absolute inset-0 bg-[#0a0a0a]/85 flex justify-center items-center z-[120] text-white font-sans backdrop-blur-md">
      <div className="flex flex-row items-stretch gap-0 w-[95%] max-w-[1000px] max-h-[85vh] m-auto box-border z-[121] relative">
        <div className="hidden md:block flex-[0_0_320px] relative z-[2] -mr-20 pointer-events-none">
          <img
            src={activeCharacter.visualUrl}
            alt={`${activeCharacter.id}-avatar`}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none opacity-95"
          />
        </div>
        <div className="flex-1 bg-[#121c32]/95 border-2 border-[#ff7a99] rounded-[20px] p-6 pl-4 md:pl-20 shadow-[0_16px_48px_rgba(0,0,0,0.8),_0_0_32px_rgba(255,122,153,0.08)] backdrop-blur-[20px] flex flex-col gap-4 relative overflow-hidden box-border">
          <div className="flex flex-col gap-1 items-center">
            <h2 className="relative z-[1] text-[2.2rem] font-extrabold bg-gradient-to-br from-[#ff7a99] to-[#80deea] bg-clip-text text-transparent text-center m-0 mb-1 tracking-[4px]">
              {t('result.finalTitle', 'Game Concluded')}
            </h2>
            {room.gameId && (
              <div className="text-[#aaa] text-[0.85rem] flex items-center justify-center gap-2">
                <span>
                  {t('hud.gameId')}: {room.gameId}
                </span>
                <CopyGameIdButton gameId={room.gameId} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
            <div className="flex flex-col gap-3 mt-4">
              {rankedPlayers.map((item, index) => {
                const rank = index + 1;
                const displayName = getPlayerDisplayName(item.player, t);
                const initials =
                  item.player.aiType !== AiType.AI_TYPE_NONE
                    ? 'AI'
                    : displayName.slice(0, 2).toUpperCase();

                const styles = rankStyles(rank);

                return (
                  <div
                    key={item.player.id}
                    className={`flex items-center gap-4 rounded-lg px-4 py-3 border transition-all duration-200 ${styles.card}`}
                  >
                    <div
                      className={`text-[1.8rem] font-bold w-8 text-center ${styles.number}`}
                    >
                      #{rank}
                    </div>
                    <div
                      className={`w-12 h-12 bg-[#444] rounded-full flex justify-center items-center text-[1.2rem] font-bold border-2 ${styles.avatar}`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-[1.2rem] font-medium">
                        {displayName}
                      </span>
                      <span className="text-[1.4rem] font-semibold text-[#ff7a99]">
                        {item.points}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onReturnToRoom} className="w-full">
              {t('result.returnToRoom', 'Return to Room')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
