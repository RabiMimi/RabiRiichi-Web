import { describe, it, expect } from 'vitest';
import {
  ACTION_ASSET_KEYS,
  RENDERED_ACTION_TYPES,
  getActionAssetKey,
} from './actionArtwork';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import zhs from '../locales/zhs.json';

/** Resolves a dotted i18n key against a locale bundle. */
function lookup(bundle: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      bundle,
    );
}

describe('action artwork', () => {
  it('gives every action the panel renders its own artwork', () => {
    // A missing entry falls back to a plain-text button, which is how
    // kyuushu kyuuhai shipped with no image.
    const missing = RENDERED_ACTION_TYPES.filter(
      (type) => ACTION_ASSET_KEYS[type] === null,
    );
    expect(missing).toEqual([]);
  });

  it('resolves every artwork key in every locale', () => {
    const locales = { en, ja, zhs };
    for (const [name, bundle] of Object.entries(locales)) {
      for (const [type, key] of Object.entries(ACTION_ASSET_KEYS)) {
        if (key === null) continue;
        expect(lookup(bundle, key), `${name}: ${type} -> ${key}`).toEqual(
          expect.stringContaining('/assets/ui/'),
        );
      }
    }
  });

  it('maps the declarable draw to the kyuushu kyuuhai artwork', () => {
    expect(getActionAssetKey('ryuukyoku')).toBe('assets.ui.kyuushu_kyuuhai');
  });

  it('lets a caller override the artwork for a type', () => {
    // A win is offered as either ron or tsumo; the type alone cannot say which.
    expect(getActionAssetKey('agari')).toBe('assets.ui.ron');
    expect(getActionAssetKey('agari', 'assets.ui.tsumo')).toBe(
      'assets.ui.tsumo',
    );
  });

  it('renders no artwork for actions the panel never shows', () => {
    expect(getActionAssetKey('play-tile')).toBeNull();
    expect(getActionAssetKey('next-round')).toBeNull();
  });
});
