import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useRoom, useSelf } from '../state/store';
import { UserStatus, AiType } from '../proto';
import { pollUntil } from '../lib';
import { type PlayerModel, getPlayerDisplayName } from '../domain/model';
import './ui.css';

export function RoomScreen(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentUser = useSelf();
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
    return room.players.find((p) => p.seat === index);
  });
  const firstEmptySeatIndex = seats.findIndex((p) => p === undefined);

  const handleAddAi = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await rabiriichi.addAi(AiType.AI_TYPE_DUMMY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add AI');
    } finally {
      setIsLoading(false);
    }
  };

  const onAddAi = () => {
    void handleAddAi();
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
      <div className="player-avatar-placeholder" title={displayName}>
        {initials}
      </div>
    );
  };

  return (
    <div className="ui-screen room-screen">
      <div className="ui-card room-card">
        <h2 className="ui-title">{t('room.title', { id: room.id })}</h2>

        {error && <div className="ui-error">{error}</div>}

        <div className="player-list">
          {seats.map((player, index) => {
            if (player) {
              const playerIsReady =
                player.status === UserStatus.USER_STATUS_READY;
              const isMe = player.id === currentUser.id;
              return (
                <div
                  key={player.id}
                  className={`player-card ${isMe ? 'is-me' : ''} ${
                    player.aiType !== AiType.AI_TYPE_NONE ? 'is-ai' : ''
                  }`}
                >
                  {renderAvatar(player)}
                  <div className="player-details">
                    <div className="player-name">
                      {getPlayerDisplayName(player, t)}{' '}
                      {isMe && `(${t('lobby.you')})`}
                      {player.aiType !== AiType.AI_TYPE_NONE && (
                        <span
                          className="ai-badge-text"
                          title={t(`ai.type.${player.aiType}`)}
                        >
                          AI
                        </span>
                      )}
                    </div>
                    <div className="player-seat">
                      {t('room.seat', { seat: index })}
                    </div>
                  </div>
                  <div
                    className={`player-status-badge ${
                      playerIsReady || player.aiType !== AiType.AI_TYPE_NONE
                        ? 'ready'
                        : 'waiting'
                    }`}
                  >
                    {playerIsReady || player.aiType !== AiType.AI_TYPE_NONE
                      ? t('room.status.ready')
                      : t('room.status.waiting')}
                  </div>
                </div>
              );
            } else {
              return (
                <div key={`empty-${index}`} className="player-card empty-seat">
                  <div className="player-avatar-placeholder empty">?</div>
                  <div className="player-details">
                    <div className="player-name empty-text">
                      {t('room.emptySeat')}
                    </div>
                    <div className="player-seat">
                      {t('room.seat', { seat: index })}
                    </div>
                  </div>
                  {isOwner && index === firstEmptySeatIndex && (
                    <button
                      className="ui-button mini-button add-ai-btn"
                      onClick={onAddAi}
                      disabled={isLoading}
                    >
                      {t('room.addAi')}
                    </button>
                  )}
                </div>
              );
            }
          })}
        </div>

        <div className="room-actions">
          <button
            onClick={onToggleReady}
            className={`ui-button ${isReady ? 'secondary-button' : 'primary-button'}`}
            disabled={isLoading}
          >
            {isLoading
              ? t('room.updating')
              : isReady
                ? t('room.unready')
                : t('room.ready')}
          </button>

          <button
            onClick={onLeaveRoom}
            className="ui-button secondary-button"
            disabled={isLoading}
          >
            {t('room.leave')}
          </button>
        </div>
      </div>
    </div>
  );
}
