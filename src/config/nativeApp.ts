import config from '../../android/client-config.json';

/**
 * Query flag the client-switch links carry while inside the Android app: the
 * other origin has its own storage and sees an https referrer, so without it
 * the app would be forgotten after switching.
 */
export const NATIVE_APP_PARAM = 'client';
export const NATIVE_APP_PARAM_VALUE = 'android-app';
const STORAGE_KEY = 'rabiriichi.nativeApp';

interface NativeAppSignals {
  referrer: string;
  search: string;
  remembered: boolean;
}

/**
 * Whether this page runs inside the Android app (a Trusted Web Activity).
 *
 * Chrome reports the app as an `android-app://<package>/` referrer on launch.
 * Reloads (the PWA updater) and client switches lose that, so the answer is
 * also remembered for the session and passed along as a query flag.
 */
export function detectNativeApp({
  referrer,
  search,
  remembered,
}: NativeAppSignals): boolean {
  return (
    remembered ||
    referrer.startsWith(`android-app://${config.packageId}`) ||
    new URLSearchParams(search).get(NATIVE_APP_PARAM) === NATIVE_APP_PARAM_VALUE
  );
}

function readRemembered(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function remember(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Without storage the referrer or query flag still covers this page load.
  }
}

/** Drop the switch flag from the address bar once it has been read. */
function stripFlag(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(NATIVE_APP_PARAM)) return;
  url.searchParams.delete(NATIVE_APP_PARAM);
  window.history.replaceState(window.history.state, '', url);
}

function resolveNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const isNativeApp = detectNativeApp({
    referrer: document.referrer,
    search: window.location.search,
    remembered: readRemembered(),
  });
  if (isNativeApp) remember();
  stripFlag();
  return isNativeApp;
}

/** Resolved once at startup; it cannot change while the page is open. */
export const IS_NATIVE_APP = resolveNativeApp();
