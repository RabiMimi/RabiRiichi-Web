import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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
    <div className="fixed inset-0 z-[9999] box-border flex h-screen w-screen flex-col items-center justify-center bg-[#121212] p-5 text-center text-white">
      <div className="animate-rotate-device mb-5 text-[4rem]">🔄</div>
      <p className="max-w-[80%] text-[1.2rem] font-bold leading-normal text-[#ff7a99]">
        {t('orientation.rotatePrompt')}
      </p>
    </div>
  );
}
