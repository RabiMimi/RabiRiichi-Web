import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ui.css';

export function OrientationGuard(): React.JSX.Element | null {
  const { t } = useTranslation();
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      if (isMobile) {
        setIsPortrait(window.innerHeight > window.innerWidth);
      } else {
        setIsPortrait(false);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="portrait-orientation-overlay">
      <div className="rotate-device-icon">🔄</div>
      <p className="rotate-prompt-text">{t('orientation.rotatePrompt')}</p>
    </div>
  );
}
