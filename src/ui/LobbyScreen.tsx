import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useSelf } from '../state/store';
import { formatError } from '../lib';
import type { IGameConfigMsg } from '../proto';
import { RoomConfigPanel } from './RoomConfigPanel';
import { ReplayModal } from './ReplayModal';
import { Button } from './Button';
import { SCREEN, FORM } from './styles';

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
    <div className={SCREEN.base}>
      <div className={`${SCREEN.card} max-w-[960px]`}>
        {/* Header with Title and Language Switcher */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-baseline gap-2">
            <h2 className={SCREEN.title} style={{ margin: 0 }}>
              {t('lobby.title')}
            </h2>
            {rabiriichi.wsurl && (
              <span className="text-[0.85rem] text-[#888] font-normal">
                (
                {t('lobby.connectedServer', {
                  url: rabiriichi.wsurl.replace(/^wss?:\/\//, ''),
                })}
                )
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <select
              value={i18n.language}
              onChange={(e) => void i18n.changeLanguage(e.target.value)}
              className="px-2 py-1 rounded bg-[#1a1a1a] text-white border border-[#555] cursor-pointer text-[0.9rem]"
            >
              <option value="zhs">简体中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            {currentUser && (
              <span className="text-[0.8rem] text-white text-right">
                {t('lobby.welcome', {
                  nickname: currentUser.nickname,
                  id: currentUser.id,
                })}
              </span>
            )}
          </div>
        </div>

        {error && <div className={FORM.error}>{error}</div>}

        <div className="flex flex-col gap-3 mt-4">
          <RoomConfigPanel
            onCreateRoom={handleCreateRoom}
            isLoading={isLoading}
          />

          <div className="flex flex-col gap-4 border-t border-[#444] pt-4 mt-2 min-[480px]:flex-row min-[480px]:justify-between min-[480px]:items-end">
            <form
              onSubmit={onJoinRoom}
              className="flex flex-col gap-1.5 flex-1"
            >
              <label htmlFor="room-id" className={FORM.label}>
                {t('lobby.joinRoomLabel')}
              </label>
              <div className="flex gap-2.5">
                <input
                  id="room-id"
                  type="text"
                  className={`${FORM.input} w-[120px]`}
                  value={roomIdInput}
                  onChange={(e) =>
                    setRoomIdInput(
                      e.target.value.replace(/\D/g, '').slice(0, 4),
                    )
                  }
                  disabled={isLoading}
                  placeholder="1234"
                  pattern="\d{4}"
                />
                <Button
                  type="submit"
                  disabled={isLoading || roomIdInput.length !== 4}
                  className="whitespace-nowrap"
                >
                  {t('lobby.joinRoom')}
                </Button>
              </div>
            </form>

            <Button
              variant="secondary"
              onClick={() => setIsReplayModalOpen(true)}
              disabled={isLoading}
            >
              {t('lobby.viewReplay')}
            </Button>
            <Button
              variant="danger"
              onClick={handleLogout}
              disabled={isLoading}
            >
              {t('lobby.logout')}
            </Button>
          </div>
        </div>
      </div>
      {isReplayModalOpen && (
        <ReplayModal onClose={() => setIsReplayModalOpen(false)} />
      )}
    </div>
  );
}
