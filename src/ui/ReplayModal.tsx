import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { startReplay } from '../replay/replayDriver';
import { formatError } from '../lib';

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
    <div className="replay-modal-overlay">
      <div className="replay-modal-content">
        <div className="replay-modal-header">
          <h3>{t('replay.modalTitle')}</h3>
          <button
            className="close-btn"
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>

        {error && <div className="ui-error">{error}</div>}

        <form onSubmit={(e) => void handleLoadReplay(e)} className="ui-form">
          <div className="replay-modal-body">
            <div className="form-group">
              <label htmlFor="replay-game-id">{t('replay.gameIdLabel')}</label>
              <input
                id="replay-game-id"
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                disabled={isLoading}
                placeholder={t('replay.gameIdPlaceholder')}
                autoFocus
              />
            </div>
          </div>

          <div className="replay-modal-actions">
            <button
              type="button"
              className="ui-button secondary-button"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('replay.cancel')}
            </button>
            <button
              type="submit"
              className="ui-button primary-button"
              disabled={isLoading || !gameId.trim()}
            >
              {isLoading ? t('connect.connecting') : t('replay.load')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
