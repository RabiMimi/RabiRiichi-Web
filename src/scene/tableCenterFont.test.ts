import { describe, expect, it } from 'vitest';
import { getTableCenterFontPath } from './assets';

describe('getTableCenterFontPath', () => {
  it('uses the Japanese face for Japanese', () => {
    expect(getTableCenterFontPath('ja')).toContain('YujiSyuku');
  });

  it('matches regional tags to their base language', () => {
    expect(getTableCenterFontPath('ja-JP')).toBe(getTableCenterFontPath('ja'));
  });

  it('uses the Chinese face elsewhere, including when unset', () => {
    for (const language of ['zhs', 'en', 'ko', undefined]) {
      expect(getTableCenterFontPath(language)).toContain('AaShenYeShiTang');
    }
  });

  it('never points troika at a woff2, which it cannot read', () => {
    // troika-three-text throws "woff2 fonts not supported"; it also has no
    // fallback, so the file it loads must be a TTF containing every glyph.
    for (const language of ['ja', 'zhs', 'en', undefined]) {
      expect(getTableCenterFontPath(language)).toMatch(/\.ttf$/);
    }
  });
});
