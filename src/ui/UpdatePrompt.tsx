import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';
import { canOfferUpdate } from './updateGate';

/** How often a long-lived install re-checks for a new worker. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

interface UpdatePromptProps {
  isReplay: boolean;
  isInGame: boolean;
}

/**
 * Offers a pending update, and applies it only when the player says so.
 *
 * The worker is registered here rather than by an injected snippet, because
 * the app needs the `needRefresh` signal to decide *when* to surface it. The
 * worker itself does not skipWaiting, so a new build sits in `waiting` until
 * `updateServiceWorker()` posts SKIP_WAITING and reloads — never mid-hand.
 *
 * The periodic check matters because this ships as a fullscreen install that
 * people leave open for hours; without a navigation the browser may not look
 * for a new worker on its own.
 */
export function UpdatePrompt({
  isReplay,
  isInGame,
}: UpdatePromptProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [isApplying, setIsApplying] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => {
        void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  const applyUpdate = useCallback(() => {
    if (isApplying) return;
    setIsApplying(true);

    // Reload once the new worker takes over, rather than leaving it to
    // workbox-window. Its own handler only reloads when it considers the
    // registration an update, and it decides that from whether a controller
    // existed when it registered — which on a first visit is nothing, because
    // clientsClaim only grants one afterwards. The page would then keep running
    // the old bundle against the new worker's cache.
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => window.location.reload(),
      { once: true },
    );
    void updateServiceWorker(true);
  }, [isApplying, updateServiceWorker]);

  if (!needRefresh || !canOfferUpdate({ isReplay, isInGame })) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 rounded-full border-[1.5px] border-[#ff7a99] bg-[#141414]/95 py-2 pl-4 pr-2 text-sm text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] pointer-events-auto"
    >
      <span>{t('update.available', 'A new version is available')}</span>
      <Button size="compact" onClick={applyUpdate} disabled={isApplying}>
        {t('update.reload', 'Reload')}
      </Button>
    </div>
  );
}
