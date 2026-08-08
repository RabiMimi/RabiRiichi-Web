/**
 * WebSocket endpoint URL helpers.
 *
 * The server exposes two endpoints under a base URL: `/ws/public`
 * (unauthenticated) and `/ws/connect` (authenticated). These pure helpers
 * derive the full endpoint URL from a user-supplied base, tolerating bare
 * host[:port] input by defaulting to the `ws://` scheme.
 */

function resolveWSUrl(baseUrl: string, path: string): string {
  try {
    return new URL(path, baseUrl).href;
  } catch {
    // Bare host (no scheme): assume insecure ws:// and retry.
    const withScheme =
      baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')
        ? baseUrl
        : 'ws://' + baseUrl;
    return new URL(path, withScheme).href;
  }
}

/** Full URL of the unauthenticated public endpoint for `baseUrl`. */
export function getPublicWSUrl(baseUrl: string): string {
  return resolveWSUrl(baseUrl, '/ws/public');
}

/** Full URL of the authenticated game endpoint for `baseUrl`. */
export function getUserWSUrl(baseUrl: string): string {
  return resolveWSUrl(baseUrl, '/ws/connect');
}
