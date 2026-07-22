import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useCharacterId,
  useSelf,
  useIsReplay,
  useActiveStickers,
  useActiveChatTexts,
} from '../state/store';
import { getPlayerDisplayName } from '../domain/model';
import { AiType } from '../proto';
import { CHARACTERS } from '../domain/character';
import { Button } from './Button';
import { CopyGameIdButton } from './CopyGameIdButton';
import { Tooltip } from './Tooltip';
import { rabiriichi } from '../net/client';
import { soundManager } from '../lib/sound';
import { getFinalPlacementVoiceLineId } from '../domain/resultHelpers';
import { StickerBubble } from './StickerBubble';
import { ChatBubble } from './ChatBubble';

interface FinalResultPanelProps {
  onReturnToRoom: () => void;
}

export function FinalResultPanel({
  onReturnToRoom,
}: FinalResultPanelProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const characterId = useCharacterId();
  const self = useSelf();
  const isReplay = useIsReplay();
  const activeStickers = useActiveStickers();
  const activeChatTexts = useActiveChatTexts();
  const [shareCopied, setShareCopied] = React.useState(false);

  React.useEffect(() => {
    // Play placement voice line when final result screen opens
    if (isReplay || !self || !room) return;
    const finalRank =
      room.players
        .slice()
        .sort((a, b) => (b.gameState?.points ?? 0) - (a.gameState?.points ?? 0))
        .findIndex((p) => p.id === self.id) + 1;
    if (finalRank < 1 || finalRank > 4) return;
    const voiceLineId = getFinalPlacementVoiceLineId(
      finalRank,
      room.players.length,
    );
    if (!voiceLineId) return;

    const char = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
    const voiceLine = char?.voiceLines.find((l) => l.id === voiceLineId);
    if (voiceLine) {
      soundManager.playVoice(voiceLine.audioUrl);
    }
  }, [characterId, isReplay, room, self]);

  React.useEffect(() => {
    // Flush deferred chat messages with a 10s display duration for the final rankings screen
    rabiriichi.flushDeferredChats(10000);
  }, []);

  const handleShareReplay = async () => {
    if (!room?.gameId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?gameId=${room.gameId}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  const rankedPlayers = React.useMemo(() => {
    if (!room) return [];
    return room.players
      .map((player) => ({
        player,
        points: player.gameState?.points ?? 0,
      }))
      .sort((a, b) => b.points - a.points);
  }, [room]);

  const activeCharacter =
    CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0]!;

  const rankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          card: 'bg-gradient-to-r from-[#ffd700]/20 via-[#1a2942]/90 to-[#121c32]/95 border-[#ffd700] shadow-[0_0_20px_rgba(255,215,0,0.3)]',
          number:
            'text-[#ffd700] drop-shadow-[0_2px_8px_rgba(255,215,0,0.5)] font-black',
          avatar: 'border-[#ffd700]',
        };
      case 2:
        return {
          card: 'bg-gradient-to-r from-[#c0c0c0]/15 via-[#1a2942]/90 to-[#121c32]/95 border-[#c0c0c0] shadow-[0_0_12px_rgba(192,192,192,0.2)]',
          number: 'text-[#c0c0c0] font-bold',
          avatar: 'border-[#c0c0c0]',
        };
      case 3:
        return {
          card: 'bg-gradient-to-r from-[#cd7f32]/15 via-[#1a2942]/90 to-[#121c32]/95 border-[#cd7f32] shadow-[0_0_12px_rgba(205,127,50,0.2)]',
          number: 'text-[#cd7f32] font-bold',
          avatar: 'border-[#cd7f32]',
        };
      default:
        return {
          card: 'bg-[#121c32]/80 border-[#2a3a5e]',
          number: 'text-[#888] font-semibold',
          avatar: 'border-[#444]',
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
        <div className="flex-1 bg-[#121c32]/95 border-2 border-[#ff7a99] rounded-2xl p-2 pl-2 lg:p-4 lg:pl-16 shadow-[0_16px_48px_rgba(0,0,0,0.8),_0_0_32px_rgba(255,122,153,0.08)] backdrop-blur-[20px] flex flex-col gap-1.5 lg:gap-2.5 relative box-border">
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
            className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5 lg:gap-2.5 px-2 py-8"
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
                    className={`flex items-center gap-1.5 lg:gap-4 rounded-lg px-2 py-1.5 lg:px-4 lg:py-3 border transition-all duration-200 relative ${styles.card}`}
                  >
                    <div
                      className={`text-base lg:text-3xl font-bold w-5 lg:w-8 text-center ${styles.number}`}
                    >
                      #{rank}
                    </div>
                    <div className="relative shrink-0 flex items-center justify-center">
                      <div
                        className={`w-7 h-7 lg:w-12 lg:h-12 bg-[#444] rounded-full flex justify-center items-center text-xs lg:text-xl font-bold border-2 ${styles.avatar}`}
                      >
                        {initials}
                      </div>
                      <StickerBubble
                        sticker={activeStickers[item.player.id]}
                        className="sticker-bubble-2d"
                        placement={index === 0 ? 'bottom' : 'top'}
                      />
                      <ChatBubble
                        text={activeChatTexts[item.player.id]}
                        className="chat-bubble-2d"
                        placement={index === 0 ? 'bottom' : 'top'}
                        hasSticker={Boolean(activeStickers[item.player.id])}
                      />
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

          <div className="flex justify-end gap-3 mt-1 lg:mt-2 pt-2 border-t border-[#ff7a99]/20">
            <Button variant="primary" onClick={onReturnToRoom}>
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
