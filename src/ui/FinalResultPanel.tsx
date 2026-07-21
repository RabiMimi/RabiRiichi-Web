import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom, useCharacterId, useSelf, useIsReplay } from '../state/store';
import { getPlayerDisplayName } from '../domain/model';
import { AiType } from '../proto';
import { CHARACTERS } from '../domain/character';
import { Button } from './Button';
import { CopyGameIdButton } from './CopyGameIdButton';
import { Tooltip } from './Tooltip';
import { rabiriichi } from '../net/client';
import { soundManager } from '../lib/sound';
import { getFinalPlacementVoiceLineId } from '../domain/resultHelpers';

interface FinalResultPanelProps {
  onReturnToRoom: () => void;
}

export function FinalResultPanel({
  onReturnToRoom,
}: FinalResultPanelProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const selfId = useSelf()?.id;
  const characterId = useCharacterId();
  const isReplay = useIsReplay();
  const [shareCopied, setShareCopied] = React.useState(false);

  const handleShareReplay = async () => {
    if (!room?.gameId) return;
    const serverUrl = rabiriichi.wsurl;
    if (!serverUrl) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?server=${encodeURIComponent(serverUrl)}&replay=${room.gameId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy replay link', err);
    }
  };

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

  const playedReaction = React.useRef(false);
  React.useEffect(() => {
    if (playedReaction.current || selfId === undefined) return;
    const rank =
      rankedPlayers.findIndex((item) => item.player.id === selfId) + 1;
    const voiceId = getFinalPlacementVoiceLineId(rank, rankedPlayers.length);
    if (!voiceId) return;

    const voiceLine = activeCharacter.voiceLines.find(
      (line) => line.id === voiceId,
    );
    if (voiceLine) {
      playedReaction.current = true;
      soundManager.playVoice(voiceLine.audioUrl);
    }
  }, [activeCharacter, rankedPlayers, selfId]);

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
        <div className="flex-1 bg-[#121c32]/95 border-2 border-[#ff7a99] rounded-2xl p-2 pl-2 lg:p-4 lg:pl-16 shadow-[0_16px_48px_rgba(0,0,0,0.8),_0_0_32px_rgba(255,122,153,0.08)] backdrop-blur-[20px] flex flex-col gap-1.5 lg:gap-2.5 relative overflow-hidden box-border">
          <div className="flex flex-col gap-1 items-center">
            <h2 className="relative z-[1] text-lg lg:text-4xl font-extrabold bg-gradient-to-br from-[#ff7a99] to-[#80deea] bg-clip-text text-transparent text-center m-0 mb-0.5 tracking-wider lg:tracking-widest">
              {t('result.finalTitle', 'Game Concluded')}
            </h2>
            {room.gameId && (
              <div className="text-[#aaa] text-xs flex items-center justify-center gap-2">
                <span>
                  {t('hud.gameId')}: {room.gameId}
                </span>
                <CopyGameIdButton gameId={room.gameId} />
                <Tooltip
                  content={shareCopied ? t('common.copied') : t('common.share')}
                  position="top"
                  forceVisible={shareCopied ? true : undefined}
                >
                  <button
                    type="button"
                    className="bg-transparent border-none text-[#ff7a99] cursor-pointer p-0 flex items-center hover:scale-105 active:scale-95 transition-all duration-150"
                    onClick={() => void handleShareReplay()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                      />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          <div
            className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-1.5 lg:gap-2.5 pr-1"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1 lg:gap-2 mt-1 lg:mt-2">
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
                    className={`flex items-center gap-1.5 lg:gap-4 rounded-lg px-2 py-1.5 lg:px-4 lg:py-3 border transition-all duration-200 ${styles.card}`}
                  >
                    <div
                      className={`text-base lg:text-3xl font-bold w-5 lg:w-8 text-center ${styles.number}`}
                    >
                      #{rank}
                    </div>
                    <div
                      className={`w-7 h-7 lg:w-12 lg:h-12 bg-[#444] rounded-full flex justify-center items-center text-xs lg:text-xl font-bold border-2 ${styles.avatar}`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-xs lg:text-xl font-medium">
                        {displayName}
                      </span>
                      <span className="text-sm lg:text-2xl font-semibold text-[#ff7a99]">
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
              {isReplay
                ? t('result.returnToReplay', 'Return to Replay')
                : t('result.returnToRoom', 'Return to Room')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
