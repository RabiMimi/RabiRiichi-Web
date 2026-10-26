/**
 * Which visitors the Pages middleware sends to a regional mirror, and where.
 *
 * Pure so it can be tested here and run unchanged in `functions/`. It reads
 * the JSON config directly rather than through clientEnvironments.ts, whose
 * imports touch `window` at load and would crash in the Workers runtime.
 */
import config from '../../android/client-config.json';

export interface RedirectableRequest {
  url: string;
  method: string;
  headers: Pick<Headers, 'get'>;
}

/**
 * Only top-level page loads move. Everything after that is requested relative
 * to the mirror, so subresources never reach the primary host — except from a
 * service worker already installed there, whose script, precache and update
 * fetches must keep working: a redirected worker script fails to update, and
 * a cross-origin precache fetch fails the install.
 */
function isNavigation({ method, headers }: RedirectableRequest): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  const mode = headers.get('sec-fetch-mode');
  if (mode !== null) return mode === 'navigate';
  return headers.get('accept')?.includes('text/html') ?? false;
}

/**
 * The mirror URL for this request, or null to serve it here.
 *
 * Digital Asset Links verification does not follow redirects, so the TWA's
 * `/.well-known/assetlinks.json` is always served from the host asked for.
 */
export function getMirrorRedirect(
  request: RedirectableRequest,
  country: string | undefined,
): string | null {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/.well-known/')) return null;
  if (!isNavigation(request)) return null;

  const mirror = config.mirrors.find((m) => m.country === country);
  if (!mirror) return null;
  const environment = (
    Object.keys(config.origins) as (keyof typeof config.origins)[]
  ).find((env) => config.origins[env] === url.origin);
  if (!environment) return null;

  const target = new URL(mirror.origins[environment]);
  target.pathname = url.pathname;
  target.search = url.search;
  return target.href;
}
