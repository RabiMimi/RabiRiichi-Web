import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { startReplay } from '../replay/replayDriver';
import { formatError } from '../lib';
import { Button } from './Button';
import { FORM, MODAL } from './styles';

interface ReplayModalProps {
  onClose: () => void;
}

export function ReplayModal({ onClose }: ReplayModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [gameId, setGameId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadReplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId.trim()) return;
    setError(null);
    setIsLoading(true);

    try {
      const log = await rabiriichi.fetchReplay(gameId.trim());
      void startReplay(log);
      onClose();
    } catch (err) {
      setError(formatError(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={MODAL.overlay} onClick={onClose}>
      <div
        className={`${MODAL.card} w-[90%] max-w-[400px] border border-[#ff7a99]/30 bg-[#121c32]/95`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL.header}>
          <h3 className="text-lg font-bold text-[#ff7a99]">
            {t('replay.modalTitle')}
          </h3>
          <button
            className={MODAL.closeButton}
            onClick={onClose}
            disabled={isLoading}
          >
            &times;
          </button>
        </div>

        {error && <div className={FORM.error}>{error}</div>}

        <form
          onSubmit={(e) => void handleLoadReplay(e)}
          className="flex flex-col gap-4"
        >
          <div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="replay-game-id" className={FORM.label}>
                {t('replay.gameIdLabel')}
              </label>
              <input
                id="replay-game-id"
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                disabled={isLoading}
                placeholder={t('replay.gameIdPlaceholder')}
                className={FORM.input}
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('replay.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !gameId.trim()}>
              {isLoading ? t('connect.connecting') : t('replay.load')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
