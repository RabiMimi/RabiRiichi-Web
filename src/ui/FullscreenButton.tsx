import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from './Tooltip';
import { IconButton } from './IconButton';

interface FullscreenButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function FullscreenButton({
  className,
  style,
}: FullscreenButtonProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && document.fullscreenElement != null,
  );
  const [isSupported] = useState(
    () => typeof document !== 'undefined' && document.fullscreenEnabled,
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement != null);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable full-screen mode:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Error attempting to exit full-screen mode:', err);
      });
    }
  };

  if (!isSupported) return null;

  return (
    <Tooltip
      content={
        isFullscreen ? t('hud.exitFullscreen') : t('hud.enterFullscreen')
      }
      position="bottom"
    >
      <IconButton
        type="button"
        className={className ?? ''}
        onClick={toggleFullscreen}
        style={{ pointerEvents: 'auto', ...style }}
      >
        {isFullscreen ? (
          // Exit Fullscreen Icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
          </svg>
        ) : (
          // Enter Fullscreen Icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        )}
      </IconButton>
    </Tooltip>
  );
}
