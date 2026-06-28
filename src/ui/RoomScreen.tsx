import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useRoom, useSelf } from '../state/store';
import { UserStatus } from '../proto';
import { pollUntil } from '../lib';
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
  const renderAvatar = (nickname: string) => {
    const initials = nickname.slice(0, 2).toUpperCase();
    return (
      <div className="player-avatar-placeholder" title={nickname}>
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
          {room.players.map((player) => {
            const playerIsReady =
              player.status === UserStatus.USER_STATUS_READY;
            const isMe = player.id === currentUser.id;
            return (
              <div
                key={player.id}
                className={`player-card ${isMe ? 'is-me' : ''}`}
              >
                {renderAvatar(player.nickname)}
                <div className="player-details">
                  <div className="player-name">
                    {player.nickname} {isMe && `(${t('lobby.you')})`}
                  </div>
                  <div className="player-seat">
                    {player.seat !== undefined
                      ? t('room.seat', { seat: player.seat })
                      : t('room.seatAssigning')}
                  </div>
                </div>
                <div
                  className={`player-status-badge ${
                    playerIsReady ? 'ready' : 'waiting'
                  }`}
                >
                  {playerIsReady
                    ? t('room.status.ready')
                    : t('room.status.waiting')}
                </div>
              </div>
            );
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
