import { describe, it, expect } from 'vitest';
import type { KeyValueStore } from '../platform/storage';
import {
  loadCliSettings,
  saveCliSettings,
  DEFAULT_CLI_SETTINGS,
  CLI_SETTINGS_KEY,
} from './settings';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const backing: Record<string, string> = { ...initial };
  return {
    getItem: (k) => backing[k] ?? null,
    setItem: (k, v) => {
      backing[k] = v;
    },
    removeItem: (k) => {
      delete backing[k];
    },
  };
}

describe('cli settings', () => {
  it('returns defaults (unicode, unconfirmed) when nothing is stored', () => {
    expect(loadCliSettings(memoryStore())).toEqual(DEFAULT_CLI_SETTINGS);
    expect(DEFAULT_CLI_SETTINGS.tileMode).toBe('unicode');
    expect(DEFAULT_CLI_SETTINGS.tileModeConfirmed).toBe(false);
  });

  it('persists and reloads a patch', () => {
    const store = memoryStore();
    saveCliSettings(store, { tileMode: 'ascii', tileModeConfirmed: true });
    const loaded = loadCliSettings(store);
    expect(loaded.tileMode).toBe('ascii');
    expect(loaded.tileModeConfirmed).toBe(true);
    expect(loaded.language).toBe('en');
  });

  it('coerces invalid tileMode/language to safe values', () => {
    const store = memoryStore({
      [CLI_SETTINGS_KEY]: JSON.stringify({
        tileMode: 'bogus',
        language: 'fr',
        tileModeConfirmed: 'yes',
      }),
    });
    const loaded = loadCliSettings(store);
    expect(loaded.tileMode).toBe('unicode');
    expect(loaded.language).toBe('en');
    expect(loaded.tileModeConfirmed).toBe(false); // only literal true counts
  });

  it('tolerates corrupt JSON', () => {
    const store = memoryStore({ [CLI_SETTINGS_KEY]: 'not json' });
    expect(loadCliSettings(store)).toEqual(DEFAULT_CLI_SETTINGS);
  });

  it('keeps a valid language selection', () => {
    const store = memoryStore();
    saveCliSettings(store, { language: 'ja' });
    expect(loadCliSettings(store).language).toBe('ja');
  });
});
