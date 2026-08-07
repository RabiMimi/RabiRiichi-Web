import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { startReplay } from '../replay/replayDriver';
import { formatError } from '../lib';
import { Button } from './Button';
import { Input } from './Input';
import { FORM, MODAL } from './styles';

import { createPortal } from 'react-dom';

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

  return createPortal(
    <div className={MODAL.overlay} onClick={onClose}>
      <div
        className={`${MODAL.card} !p-4 w-[90%] max-w-[360px] border border-[#ff7a99]/40 bg-[#1a1a1a]/95`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-3">
          <h3 className="m-0 text-base font-bold text-[#ff7a99]">
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

        {error && (
          <div className={`${FORM.error} mb-2.5 !p-2 text-[0.85rem]`}>
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => void handleLoadReplay(e)}
          className="flex flex-col gap-3"
        >
          <div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="replay-game-id"
                className="text-[0.85rem] font-semibold text-[#ccc]"
              >
                {t('replay.gameIdLabel')}
              </label>
              <Input
                id="replay-game-id"
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                disabled={isLoading}
                placeholder={t('replay.gameIdPlaceholder')}
                inputSize="inline"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <Button
              type="button"
              variant="secondary"
              className="h-8 !py-0 text-[0.85rem]"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('replay.cancel')}
            </Button>
            <Button
              type="submit"
              className="h-8 !py-0 text-[0.85rem]"
              disabled={isLoading || !gameId.trim()}
            >
              {isLoading ? t('connect.connecting') : t('replay.load')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
