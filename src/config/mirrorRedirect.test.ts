import { describe, expect, it } from 'vitest';
import { getMirrorRedirect, type RedirectableRequest } from './mirrorRedirect';

function request(
  url: string,
  headers: Record<string, string> = { 'sec-fetch-mode': 'navigate' },
  method = 'GET',
): RedirectableRequest {
  return { url, method, headers: new Headers(headers) };
}

describe('getMirrorRedirect', () => {
  it.each([
    ['https://riichi.rabimimi.com/', 'https://riichi-cn.rabimimi.com/'],
    ['https://riichi-dev.rabimimi.com/', 'https://riichi-dev-cn.rabimimi.com/'],
  ])('sends a mainland page load on %s to its mirror', (from, to) => {
    expect(getMirrorRedirect(request(from), 'CN')).toBe(to);
  });

  it('keeps the path and query, including the Android-app flag', () => {
    expect(
      getMirrorRedirect(
        request('https://riichi.rabimimi.com/?client=android-app&room=12'),
        'CN',
      ),
    ).toBe('https://riichi-cn.rabimimi.com/?client=android-app&room=12');
  });

  it('serves everyone else from the primary host', () => {
    expect(
      getMirrorRedirect(request('https://riichi.rabimimi.com/'), 'JP'),
    ).toBeNull();
    expect(
      getMirrorRedirect(request('https://riichi.rabimimi.com/'), undefined),
    ).toBeNull();
  });

  it('never redirects the TWA asset links file', () => {
    // Android's verifier does not follow redirects.
    expect(
      getMirrorRedirect(
        request('https://riichi.rabimimi.com/.well-known/assetlinks.json'),
        'CN',
      ),
    ).toBeNull();
  });

  it.each([
    ['the worker script', '/sw.js', { 'sec-fetch-mode': 'same-origin' }],
    ['a precache fetch', '/assets/tile.glb', { 'sec-fetch-mode': 'cors' }],
    ['a script', '/assets/index-COKDhf9C.js', { 'sec-fetch-mode': 'no-cors' }],
  ])('leaves %s on the host it was asked of', (_label, path, headers) => {
    // An installed worker there must still install and update.
    expect(
      getMirrorRedirect(
        request(`https://riichi.rabimimi.com${path}`, headers),
        'CN',
      ),
    ).toBeNull();
  });

  it('falls back to Accept where Sec-Fetch-Mode is not sent', () => {
    expect(
      getMirrorRedirect(
        request('https://riichi.rabimimi.com/', { accept: 'text/html,*/*' }),
        'CN',
      ),
    ).toBe('https://riichi-cn.rabimimi.com/');
    expect(
      getMirrorRedirect(
        request('https://riichi.rabimimi.com/sw.js', { accept: '*/*' }),
        'CN',
      ),
    ).toBeNull();
  });

  it('only moves GET and HEAD', () => {
    expect(
      getMirrorRedirect(
        request('https://riichi.rabimimi.com/', undefined, 'POST'),
        'CN',
      ),
    ).toBeNull();
  });

  it.each([
    // The mirror's own origin pull lands on pages.dev; redirecting it loops.
    'https://rabiriichi-web-dev.pages.dev/',
    'https://riichi-dev-cn.rabimimi.com/',
    'https://preview.rabiriichi-web.pages.dev/',
  ])('ignores hosts other than the primary ones: %s', (url) => {
    expect(getMirrorRedirect(request(url), 'CN')).toBeNull();
  });
});
