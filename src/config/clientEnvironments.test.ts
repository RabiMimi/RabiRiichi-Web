import { describe, expect, it } from 'vitest';
import { getClientEnvironment, getClientUrl } from './clientEnvironments';

describe('client environments', () => {
  it.each(['production', 'development'] as const)(
    'recognizes the %s client origin',
    (environment) => {
      const url = getClientUrl(environment);
      expect(getClientEnvironment(new URL(url).origin)).toBe(environment);
      expect(new URL(url).pathname).toBe('/');
      expect(new URL(url).search).toBe('');
    },
  );

  it.each([
    'http://localhost:5173',
    'http://riichi.rabimimi.com',
    'https://riichi.rabimimi.com.attacker.example',
    'https://riichi-dev.rabimimi.com:8443',
  ])('does not mislabel an unrelated origin: %s', (origin) => {
    expect(getClientEnvironment(origin)).toBeUndefined();
  });
});
