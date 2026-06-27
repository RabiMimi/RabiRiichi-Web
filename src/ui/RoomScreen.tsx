import React, { useState } from 'react';
import { rabiriichi } from '../net/client';
import { useRoom, useSelf } from '../state/store';
import { UserStatus } from '../proto';
import './ui.css';

export function RoomScreen(): React.JSX.Element | null {
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

  const handleLeaveRoom = () => {
    rabiriichi.close();
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
        <h2 className="ui-title">Game Room</h2>
        <div className="room-info">
          Room ID: <span className="room-id-highlight">{room.id}</span>
        </div>

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
                    {player.nickname} {isMe && '(You)'}
                  </div>
                  <div className="player-seat">
                    Seat: {player.seat ?? 'Assigning...'}
                  </div>
                </div>
                <div
                  className={`player-status-badge ${
                    playerIsReady ? 'ready' : 'waiting'
                  }`}
                >
                  {playerIsReady ? 'READY' : 'WAITING'}
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
            {isLoading ? 'Updating...' : isReady ? 'Cancel Ready' : 'Ready Up'}
          </button>

          <button
            onClick={handleLeaveRoom}
            className="ui-button secondary-button"
            disabled={isLoading}
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
