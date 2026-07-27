import { describe, expect, it } from 'vitest';
import { getGameFontStack } from './gameFont';

describe('getGameFontStack', () => {
  it('uses the Chinese display face for Simplified Chinese', () => {
    expect(getGameFontStack('zhs')).toMatch(/^'GameFontZH'/);
  });

  it('uses the Japanese display face for Japanese', () => {
    expect(getGameFontStack('ja')).toMatch(/^'GameFont'/);
  });

  it('uses GameFontZH display face for English', () => {
    expect(getGameFontStack('en')).toMatch(/^'GameFontZH'/);
  });

  it('matches regional tags to their base language', () => {
    expect(getGameFontStack('ja-JP')).toBe(getGameFontStack('ja'));
    expect(getGameFontStack('en-US')).toBe(getGameFontStack('en'));
  });

  it('falls back to the system stack for unknown or missing languages', () => {
    const fallback =
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    expect(getGameFontStack('ko')).toBe(fallback);
    expect(getGameFontStack(undefined)).toBe(fallback);
    expect(getGameFontStack('')).toBe(fallback);
  });

  it('always ends in a generic family so text shows while fonts load', () => {
    for (const language of ['zhs', 'ja', 'en', 'unknown']) {
      expect(getGameFontStack(language)).toMatch(/sans-serif$/);
    }
  });
});
