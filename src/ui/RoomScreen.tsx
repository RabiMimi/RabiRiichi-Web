import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import {
  useRoom,
  useSelf,
  useActiveStickers,
  useActiveChatTexts,
} from '../state/store';
import { UserStatus, AiType, type ILlmAiConfig } from '../proto';
import { pollUntil } from '../lib';
import { formatError } from '../lib/errors';
import { type PlayerModel, getPlayerDisplayName } from '../domain/model';
import { AddAiDropdown } from './AddAiDropdown';
import { StickerBubble } from './StickerBubble';
import { ChatBubble } from './ChatBubble';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
import { SCREEN, FORM } from './styles';

export function RoomScreen(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentUser = useSelf();
  const activeStickers = useActiveStickers();
  const activeChatTexts = useActiveChatTexts();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!room || !currentUser) {
    return null;
  }

  // Find our own player object in the room to check our status
  const myPlayer = room.players.find((p) => p.id === currentUser.id);
  const isReady = myPlayer?.status === UserStatus.USER_STATUS_READY;

  const humanPlayers = room.players.filter(
    (p) => p.aiType === AiType.AI_TYPE_NONE,
  );
  const sortedHumans = [...humanPlayers].sort(
    (a, b) => (a.seat ?? 0) - (b.seat ?? 0),
  );
  const isOwner =
    sortedHumans.length > 0 && sortedHumans[0]?.id === currentUser.id;

  const maxPlayers = room.config?.playerCount ?? 4;
  const seats = Array.from({ length: maxPlayers }, (_, index) => {
    return room.players[index];
  });
  const firstEmptySeatIndex = seats.findIndex((p) => p === undefined);

  const handleAddAi = async (aiType: AiType, llmConfig?: ILlmAiConfig) => {
    setError(null);
    setIsLoading(true);
    try {
      await rabiriichi.addAi(aiType, llmConfig);
    } catch (err) {
      if (aiType === AiType.AI_TYPE_LLM) {
        throw err;
      }
      setError(formatError(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePlayer = async (id: number) => {
    setError(null);
    setIsLoading(true);
    try {
      await rabiriichi.removeRoomPlayer(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove player');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleReady = async () => {
    setError(null);
    setIsLoading(true);
    const nextStatus = isReady
      ? UserStatus.USER_STATUS_IN_ROOM
      : UserStatus.USER_STATUS_READY;

    try {
      await rabiriichi.updateRoom(nextStatus);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update ready status',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onToggleReady = () => {
    void handleToggleReady();
  };

  const handleLeaveRoom = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await rabiriichi.updateRoom(UserStatus.USER_STATUS_NONE);

      const success = await pollUntil(
        async () => {
          await rabiriichi.refreshMyInfo();
          return rabiriichi.self?.status === UserStatus.USER_STATUS_NONE;
        },
        { tries: 10, delayMs: 500 },
      );

      if (!success) {
        throw new Error('Failed to leave room (timeout)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
    } finally {
      setIsLoading(false);
    }
  };

  const onLeaveRoom = () => {
    void handleLeaveRoom();
  };

  // Helper to render a placeholder avatar or initials
  const renderAvatar = (player: PlayerModel) => {
    const isAi = player.aiType !== AiType.AI_TYPE_NONE;
    const displayName = getPlayerDisplayName(player, t);
    const initials = isAi ? 'AI' : displayName.slice(0, 2).toUpperCase();
    return (
      <Tooltip content={displayName} position="top">
        <div className="w-12 h-12 rounded-full bg-white/[0.05] border-2 border-[#ff7a99]/40 flex justify-center items-center font-bold text-[#ff7a99] text-[1.1rem] shrink-0">
          {initials}
        </div>
      </Tooltip>
    );
  };

  return (
    <div className={SCREEN.base}>
      <div className={`${SCREEN.card} max-w-[800px]`}>
        <h2 className={SCREEN.title}>{t('room.title', { id: room.id })}</h2>

        {error && <div className={FORM.error}>{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-6 max-h-[600px]:max-h-[180px] max-h-[600px]:overflow-y-auto max-h-[600px]:mb-3 max-h-[600px]:pr-1">
          {seats.map((player, index) => {
            if (player) {
              const playerIsReady =
                player.status === UserStatus.USER_STATUS_READY;
              const isMe = player.id === currentUser.id;
              return (
                <div
                  key={player.id}
                  className={`relative flex items-center bg-[#1a1a1a] border ${
                    isMe
                      ? 'border-[#ff7a99] bg-[#ff7a99]/[0.08]'
                      : 'border-[#444]'
                  } rounded-lg p-3 gap-3 transition-colors duration-200`}
                >
                  <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                    {renderAvatar(player)}
                    <StickerBubble
                      sticker={activeStickers[player.id]}
                      className="sticker-bubble-2d"
                    />
                    <ChatBubble
                      text={activeChatTexts[player.id]}
                      className="chat-bubble-2d"
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="font-bold text-[1.05rem]">
                      {getPlayerDisplayName(player, t)}{' '}
                      {isMe && `(${t('lobby.you')})`}
                      {player.aiType !== AiType.AI_TYPE_NONE && (
                        <Tooltip
                          content={t(`ai.type.${player.aiType}`)}
                          position="top"
                        >
                          <span className="bg-[#3f51b5] text-white text-[0.75rem] px-1.5 py-0.5 rounded ml-2 align-middle font-normal">
                            AI
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-[0.8rem] text-[#888] mt-0.5">
                      {t('room.seat', { seat: index })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div
                      className={`text-[0.8rem] font-bold px-2.5 py-1.5 rounded border whitespace-nowrap shrink-0 ${
                        playerIsReady || player.aiType !== AiType.AI_TYPE_NONE
                          ? 'bg-green-500/15 text-green-500 border-green-500/30'
                          : 'bg-yellow-500/5 text-yellow-500 border-yellow-500/20'
                      }`}
                    >
                      {playerIsReady || player.aiType !== AiType.AI_TYPE_NONE
                        ? t('room.status.ready')
                        : t('room.status.waiting')}
                    </div>
                    {isOwner && player.aiType !== AiType.AI_TYPE_NONE && (
                      <button
                        className="px-2 py-1 text-[0.8rem] bg-[#a33] text-white border-none rounded cursor-pointer whitespace-nowrap shrink-0 hover:not-disabled:bg-[#c44] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                        onClick={() => void handleRemovePlayer(player.id)}
                        disabled={isLoading}
                      >
                        {t('room.kickAi')}
                      </button>
                    )}
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={`empty-${index}`}
                  className="flex items-center border border-[#444] border-dashed bg-[#111] opacity-60 rounded-lg p-3 gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-white/[0.05] border-2 border-[#444] flex justify-center items-center font-bold text-[#888] text-[1.1rem] shrink-0">
                    ?
                  </div>
                  <div className="flex-grow">
                    <div className="font-bold text-[1.05rem] text-[#888] italic">
                      {t('room.emptySeat')}
                    </div>
                    <div className="text-[0.8rem] text-[#888] mt-0.5">
                      {t('room.seat', { seat: index })}
                    </div>
                  </div>
                  {isOwner && index === firstEmptySeatIndex && (
                    <AddAiDropdown
                      disabled={isLoading}
                      onSelect={(aiType, llmConfig) =>
                        handleAddAi(aiType, llmConfig)
                      }
                    />
                  )}
                </div>
              );
            }
          })}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onToggleReady}
            variant={isReady ? 'secondary' : 'primary'}
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading
              ? t('room.updating')
              : isReady
                ? t('room.unready')
                : t('room.ready')}
          </Button>

          <Button
            onClick={onLeaveRoom}
            variant="secondary"
            className="flex-1"
            disabled={isLoading}
          >
            {t('room.leave')}
          </Button>
        </div>
      </div>
    </div>
  );
}
