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
import {
  type PlayerModel,
  getPlayerDisplayName,
  getAiTypeName,
} from '../domain/model';
import { AddAiDropdown } from './AddAiDropdown';
import { StickerBubble } from './StickerBubble';
import { ChatBubble } from './ChatBubble';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { SCREEN, FORM, SUB_CARD } from './styles';

export function RoomScreen(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentUser = useSelf();
  const activeStickers = useActiveStickers();
  const activeChatTexts = useActiveChatTexts();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!room) return;
    const serverUrl = rabiriichi.wsurl;
    if (!serverUrl) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?server=${encodeURIComponent(serverUrl)}&joinRoom=${room.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link', err);
    }
  };

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
        <div className="relative w-full mb-6 max-h-[600px]:mb-3">
          <h2
            className={`${SCREEN.title} pr-12`}
            style={{ textAlign: 'center' }}
          >
            {t('room.title', { id: room.id })}
          </h2>
          <div className="absolute top-1/2 right-0 -translate-y-1/2">
            <Tooltip
              content={copied ? t('common.copied') : t('common.share')}
              position="top"
            >
              <IconButton
                onClick={() => void handleShare()}
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                  />
                </svg>
              </IconButton>
            </Tooltip>
          </div>
        </div>

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
                  className={`relative flex items-center gap-3 ${
                    isMe ? SUB_CARD.active : SUB_CARD.default
                  }`}
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
                          content={getAiTypeName(player.aiType, t)}
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
                      <Button
                        variant="danger"
                        size="compact"
                        className="whitespace-nowrap shrink-0"
                        onClick={() => void handleRemovePlayer(player.id)}
                        disabled={isLoading}
                      >
                        {t('room.kickAi')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={`empty-${index}`}
                  className={`flex items-center gap-3 opacity-60 ${SUB_CARD.empty}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white/[0.05] border-2 border-white/10 flex justify-center items-center font-bold text-[#888] text-[1.1rem] shrink-0">
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
