import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CLIENT_DOWNLOAD_URL } from '../config/clientEnvironments';
import {
  isAndroidDevice,
  isHandheldDevice,
  isIosDevice,
  isStandaloneDisplay,
} from './handheldDevice';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function OrientationGuard(): React.JSX.Element | null {
  const { t } = useTranslation();
  const [isPortrait, setIsPortrait] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsAndroid(isAndroidDevice(navigator.userAgent));
    setIsIos(isIosDevice(navigator.userAgent, navigator.maxTouchPoints));
    setIsStandalone(isStandaloneDisplay());

    const checkOrientation = () => {
      if (isHandheldDevice(navigator.userAgent, navigator.maxTouchPoints)) {
        setIsPortrait(window.innerHeight > window.innerWidth);
      } else {
        setIsPortrait(false);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  if (!isPortrait) return null;

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] box-border flex h-screen w-screen flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#161a1f] to-[#0d1013] p-5 text-center text-white select-none">
      <div className="my-auto flex w-full max-w-sm flex-col items-center py-4">
        {/* Animated Material Design Screen Rotation Icon Badge */}
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#ff7a99]/30 bg-[#ff7a99]/10 shadow-[0_0_24px_rgba(255,122,153,0.2)] backdrop-blur-md">
          <div className="animate-rotate-device text-[#ff7a99]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-10 w-10"
              aria-hidden="true"
            >
              <path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 5.39 19.35.84 14.12.08l1.63 2.83 1.73-.39zM8.91 1.76c-.78-.78-2.05-.78-2.83 0L1.76 6.08c-.78.78-.78 2.05 0 2.83l12.73 12.73c.78.78 2.05.78 2.83 0l4.32-4.32c.78-.78.78-2.05 0-2.83L8.91 1.76zM17.46 16.04L4.73 3.31l4.18-4.18L21.64 11.86l-4.18 4.18zM1.55 13c-.36 3.76 1.98 6.93 5.25 8.48l1.73-.39 1.63 2.83C5.03 23.16.94 18.61.47 13h1.5z" />
            </svg>
          </div>
        </div>

        {/* Prompt Titles */}
        <h2 className="text-lg font-bold leading-snug tracking-tight text-[#ff7a99]">
          {t('orientation.rotatePrompt')}
        </h2>
        <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-white/60">
          {t('orientation.landscapeHint')}
        </p>

        {/* PWA Install Hint Card */}
        {!isStandalone && (
          <div className="mt-5 w-full rounded-xl border border-white/10 bg-[#1e2327]/80 p-3.5 text-left shadow-lg backdrop-blur-md">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#80deea]/15 text-[#80deea]">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white">
                {t('orientation.pwaTitle')}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-white/65">
              {t('orientation.pwaDesc')}
            </p>

            {installPrompt ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#80deea] py-1.5 text-xs font-bold text-[#111] shadow transition hover:bg-[#4dd0e1] active:scale-[0.98]"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {t('orientation.pwaInstallButton')}
              </button>
            ) : (
              <div className="mt-2 rounded-lg bg-black/25 px-2.5 py-1.5 text-[10px] leading-normal text-white/70">
                {isIos
                  ? t('orientation.pwaIosHint')
                  : t('orientation.pwaBrowserHint')}
              </div>
            )}
          </div>
        )}

        {/* Android APK Download Card (shown on Android) */}
        {isAndroid && (
          <div className="mt-3 w-full rounded-xl border border-white/10 bg-[#1e2327]/80 p-3.5 text-left shadow-lg backdrop-blur-md">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#4ade80]/15 text-[#4ade80]">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.1218 12 8.1218s-3.5902.2898-5.1367.8279L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white">
                {t('orientation.apkTitle')}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-white/65">
              {t('orientation.apkDesc')}
            </p>
            <a
              href={CLIENT_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#4ade80] py-1.5 text-xs font-bold text-[#111] shadow transition hover:bg-[#32c969] active:scale-[0.98]"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" />
              </svg>
              {t('orientation.apkButton')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
