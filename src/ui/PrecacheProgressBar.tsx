import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractPrecacheEntries } from '../build/precacheGuard';
import {
  measurePrecacheProgress,
  precacheCacheKeys,
  precacheCacheName,
  type PrecacheProgress,
} from '../lib/precacheProgress';

const POLL_INTERVAL_MS = 500;

interface InstallProgress extends PrecacheProgress {
  /** No worker controlled the page yet, so this is the full first download. */
  isFirstInstall: boolean;
}

/**
 * Follows one installing worker until it finishes, reporting through `report`.
 * Returns a cleanup that stops polling.
 */
function trackInstall(
  worker: ServiceWorker,
  scope: string,
  report: (progress: InstallProgress | null) => void,
): () => void {
  const isFirstInstall = !navigator.serviceWorker.controller;
  // An object, so the async work below sees the flag flip after it awaits.
  const run = { stopped: false };
  let timer: ReturnType<typeof setInterval> | undefined;
  const stopTracking = () => {
    run.stopped = true;
    clearInterval(timer);
    report(null);
  };
  worker.addEventListener('statechange', () => {
    if (worker.state !== 'installing') stopTracking();
  });

  void (async () => {
    const source = await (await fetch(worker.scriptURL)).text();
    const keys = precacheCacheKeys(
      extractPrecacheEntries(source),
      worker.scriptURL,
    );
    if (run.stopped || keys.length === 0) return;
    const poll = async () => {
      const cache = await caches.open(precacheCacheName(scope));
      const cached = (await cache.keys()).map((request) => request.url);
      if (!run.stopped) {
        report({ ...measurePrecacheProgress(keys, cached), isFirstInstall });
      }
    };
    await poll();
    timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
  })().catch(() => {
    // Progress is a courtesy: if it cannot be measured, show nothing.
  });
  return stopTracking;
}

/** Progress of whichever worker is installing under `registration`. */
function usePrecacheProgress(
  registration: ServiceWorkerRegistration | undefined,
): InstallProgress | null {
  const [progress, setProgress] = useState<InstallProgress | null>(null);

  useEffect(() => {
    if (!registration) return;
    let stopTracking: (() => void) | undefined;
    const follow = () => {
      const worker = registration.installing;
      if (!worker) return;
      stopTracking?.();
      stopTracking = trackInstall(worker, registration.scope, setProgress);
    };
    follow();
    registration.addEventListener('updatefound', follow);
    return () => {
      registration.removeEventListener('updatefound', follow);
      stopTracking?.();
    };
  }, [registration]);

  return progress;
}

interface PrecacheProgressBarProps {
  registration: ServiceWorkerRegistration | undefined;
  /** Whether an update's (small) download may be shown right now. */
  mayShowUpdate: boolean;
}

/**
 * Shows the game's assets downloading for offline play, so a slow first launch
 * reads as working rather than stuck. Updates fetch only what changed and are
 * shown only where an update prompt could be.
 */
export function PrecacheProgressBar({
  registration,
  mayShowUpdate,
}: PrecacheProgressBarProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const progress = usePrecacheProgress(registration);

  if (!progress || progress.total === 0 || progress.done >= progress.total) {
    return null;
  }
  if (!progress.isFirstInstall && !mayShowUpdate) return null;

  const percent = Math.floor((progress.done / progress.total) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[10000] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-1.5 rounded-xl border-[1.5px] border-[#ff7a99] bg-[#141414]/95 px-3 py-2 text-xs text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] pointer-events-none"
    >
      <span className="truncate">
        {t('update.downloading', {
          percent,
          defaultValue: 'Downloading game assets… {{percent}}%',
        })}
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-[#ff7a99] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
