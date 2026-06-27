import React, { useState } from 'react';
import { rabiriichi } from '../net/client';
import { useSelf } from '../state/store';
import './ui.css';

export function LobbyScreen(): React.JSX.Element {
  const currentUser = useSelf();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await rabiriichi.createRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateRoom = () => {
    void handleCreateRoom();
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const roomId = parseInt(roomIdInput, 10);
    if (isNaN(roomId) || roomId < 1000 || roomId > 9999) {
      setError('Room ID must be a 4-digit number (1000-9999)');
      return;
    }

    setIsLoading(true);
    try {
      await rabiriichi.joinRoom(roomId);
    } catch (err) {
      // Typically, server returns Error with message like "Room not found" or "Room full"
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const onJoinRoom = (e: React.FormEvent) => {
    void handleJoinRoom(e);
  };

  const handleDisconnect = () => {
    rabiriichi.close();
  };

  return (
    <div className="ui-screen lobby-screen">
      <div className="ui-card lobby-card">
        <h2 className="ui-title">Lobby</h2>
        {currentUser && (
          <p className="user-welcome">
            Welcome, <strong>{currentUser.nickname}</strong>!
          </p>
        )}

        {error && <div className="ui-error">{error}</div>}

        <div className="lobby-buttons">
          <button
            onClick={onCreateRoom}
            className="ui-button primary-button"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Create Room'}
          </button>

          <form onSubmit={onJoinRoom} className="join-section">
            <div className="form-group">
              <label htmlFor="room-id">Join Existing Room</label>
              <input
                id="room-id"
                type="text"
                value={roomIdInput}
                onChange={(e) =>
                  setRoomIdInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                disabled={isLoading}
                placeholder="4-digit Room ID"
                pattern="\d{4}"
              />
            </div>
            <button
              type="submit"
              className="ui-button secondary-button"
              disabled={isLoading || roomIdInput.length !== 4}
            >
              Join Room
            </button>
          </form>

          <button
            onClick={handleDisconnect}
            className="ui-button secondary-button"
            style={{ marginTop: '12px' }}
            disabled={isLoading}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
