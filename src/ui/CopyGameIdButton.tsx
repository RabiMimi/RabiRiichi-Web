import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CopyGameIdButtonProps {
  gameId: string;
}

export function CopyGameIdButton({
  gameId,
}: CopyGameIdButtonProps): React.JSX.Element {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy Game ID:', err);
    }
  };

  return (
    <div className="copy-game-id-container">
      <button
        type="button"
        className="copy-game-id-btn"
        onClick={() => void handleCopy()}
        title={t('hud.copyGameId')}
        style={{
          background: 'none',
          border: 'none',
          color: '#ff7a99',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      {copied && <span className="copied-tooltip">{t('hud.copied')}</span>}
    </div>
  );
}
