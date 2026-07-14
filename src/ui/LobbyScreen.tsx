import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useSelf } from '../state/store';
import { formatError } from '../lib';
import type { IGameConfigMsg } from '../proto';
import { RoomConfigPanel } from './RoomConfigPanel';
import { ReplayModal } from './ReplayModal';
import './ui.css';

export function LobbyScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const currentUser = useSelf();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);

  const handleCreateRoom = async (config: IGameConfigMsg) => {
    setError(null);
    setIsLoading(true);
    try {
      await rabiriichi.createRoom(config);
    } catch (err) {
      setError(formatError(err, t));
    } finally {
      setIsLoading(false);
    }
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
      setError(formatError(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  const onJoinRoom = (e: React.FormEvent) => {
    void handleJoinRoom(e);
  };

  const handleLogout = () => {
    rabiriichi.logout();
  };

  return (
    <div className="ui-screen lobby-screen">
      <div className="ui-card lobby-card">
        {/* Header with Title and Language Switcher */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h2 className="ui-title" style={{ margin: 0 }}>
              {t('lobby.title')}
            </h2>
            {rabiriichi.wsurl && (
              <span
                className="server-url-display"
                style={{
                  fontSize: '0.85rem',
                  color: '#888',
                  fontWeight: 'normal',
                }}
              >
                (
                {t('lobby.connectedServer', {
                  url: rabiriichi.wsurl.replace(/^wss?:\/\//, ''),
                })}
                )
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '4px',
            }}
          >
            <select
              value={i18n.language}
              onChange={(e) => void i18n.changeLanguage(e.target.value)}
              className="language-selector"
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                border: '1px solid #555',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              <option value="zhs">简体中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            {currentUser && (
              <span
                className="user-welcome"
                style={{
                  fontSize: '0.8rem',
                  color: 'white',
                  textAlign: 'right',
                }}
              >
                {t('lobby.welcome', {
                  nickname: currentUser.nickname,
                  id: currentUser.id,
                })}
              </span>
            )}
          </div>
        </div>

        {error && <div className="ui-error">{error}</div>}

        <div className="lobby-buttons">
          <RoomConfigPanel
            onCreateRoom={handleCreateRoom}
            isLoading={isLoading}
          />

          <div className="lobby-bottom-row">
            <form
              onSubmit={onJoinRoom}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                flex: 1,
              }}
            >
              <label
                htmlFor="room-id"
                style={{ fontSize: '0.9rem', color: '#ccc', fontWeight: 600 }}
              >
                {t('lobby.joinRoomLabel')}
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  id="room-id"
                  type="text"
                  className="room-id-input"
                  value={roomIdInput}
                  onChange={(e) =>
                    setRoomIdInput(
                      e.target.value.replace(/\D/g, '').slice(0, 4),
                    )
                  }
                  disabled={isLoading}
                  placeholder="1234"
                  pattern="\d{4}"
                  style={{ width: '120px' }}
                />
                <button
                  type="submit"
                  className="ui-button primary-button"
                  disabled={isLoading || roomIdInput.length !== 4}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {t('lobby.joinRoom')}
                </button>
              </div>
            </form>

            <button
              onClick={() => setIsReplayModalOpen(true)}
              className="ui-button secondary-button"
              disabled={isLoading}
            >
              {t('lobby.viewReplay')}
            </button>
            <button
              onClick={handleLogout}
              className="ui-button danger-button"
              disabled={isLoading}
            >
              {t('lobby.logout')}
            </button>
          </div>
        </div>
      </div>
      {isReplayModalOpen && (
        <ReplayModal onClose={() => setIsReplayModalOpen(false)} />
      )}
    </div>
  );
}
