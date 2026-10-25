import { describe, expect, it } from 'vitest';
import {
  CLIENT_DOWNLOAD_PAGE_URL,
  getClientEnvironment,
  getClientUrl,
} from './clientEnvironments';

describe('client environments', () => {
  it('points download page URL to GitHub releases', () => {
    expect(CLIENT_DOWNLOAD_PAGE_URL).toBe(
      'https://github.com/RabiMimi/RabiRiichi-Web/releases',
    );
  });
  it.each(['production', 'development'] as const)(
    'recognizes the %s client origin',
    (environment) => {
      const url = getClientUrl(environment, false);
      expect(getClientEnvironment(new URL(url).origin)).toBe(environment);
      expect(new URL(url).pathname).toBe('/');
      expect(new URL(url).search).toBe('');
    },
  );

  it('carries only the Android-app flag across a switch from the app', () => {
    const url = new URL(getClientUrl('development', true));
    expect(getClientEnvironment(url.origin)).toBe('development');
    expect([...url.searchParams]).toEqual([['client', 'android-app']]);
  });

  it.each([
    'http://localhost:5173',
    'http://riichi.rabimimi.com',
    'https://riichi.rabimimi.com.attacker.example',
    'https://riichi-dev.rabimimi.com:8443',
  ])('does not mislabel an unrelated origin: %s', (origin) => {
    expect(getClientEnvironment(origin)).toBeUndefined();
  });
});
