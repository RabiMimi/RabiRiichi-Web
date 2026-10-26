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
      const url = getClientUrl(
        environment,
        'https://riichi.rabimimi.com',
        false,
      );
      expect(getClientEnvironment(new URL(url).origin)).toBe(environment);
      expect(new URL(url).pathname).toBe('/');
      expect(new URL(url).search).toBe('');
    },
  );

  it('carries only the Android-app flag across a switch from the app', () => {
    const url = new URL(
      getClientUrl('development', 'https://riichi.rabimimi.com', true),
    );
    expect(getClientEnvironment(url.origin)).toBe('development');
    expect([...url.searchParams]).toEqual([['client', 'android-app']]);
  });

  it.each([
    ['https://riichi-cn.rabimimi.com', 'production'],
    ['https://riichi-dev-cn.rabimimi.com', 'development'],
  ] as const)('recognizes the mirror origin %s', (origin, environment) => {
    expect(getClientEnvironment(origin)).toBe(environment);
  });

  it('switches within the mirror the player is on', () => {
    // Sending a mainland player back to the primary origin puts them on the
    // slow route the mirror exists to avoid.
    expect(
      getClientUrl('development', 'https://riichi-cn.rabimimi.com', false),
    ).toBe('https://riichi-dev-cn.rabimimi.com/');
    expect(
      getClientUrl('production', 'https://riichi-dev-cn.rabimimi.com', false),
    ).toBe('https://riichi-cn.rabimimi.com/');
  });

  it('switches to the primary origins from an unknown origin', () => {
    expect(getClientUrl('development', 'http://localhost:5173', false)).toBe(
      'https://riichi-dev.rabimimi.com/',
    );
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
