import { describe, it, expect, beforeEach } from 'vitest';
import {
  CredentialStore,
  TOKEN_STORE_KEY,
  parseClientSettings,
} from './credentialStore';
import type { KeyValueStore } from '../platform/storage';
import {
  STORAGE_KEY_SERVER_SETTINGS,
  STORAGE_KEY_CLIENT_SETTINGS,
} from '../domain/constants';

function memoryStore(initial: Record<string, string> = {}): {
  store: KeyValueStore;
  backing: Record<string, string>;
} {
  const backing: Record<string, string> = { ...initial };
  const store: KeyValueStore = {
    getItem: (k) => backing[k] ?? null,
    setItem: (k, v) => {
      backing[k] = v;
    },
    removeItem: (k) => {
      delete backing[k];
    },
  };
  return { store, backing };
}

describe('parseClientSettings', () => {
  it('returns {} for null, empty, non-object, or corrupt JSON', () => {
    expect(parseClientSettings(null)).toEqual({});
    expect(parseClientSettings('')).toEqual({});
    expect(parseClientSettings('null')).toEqual({});
    expect(parseClientSettings('42')).toEqual({});
    expect(parseClientSettings('not json')).toEqual({});
  });

  it('parses a valid settings object', () => {
    expect(parseClientSettings('{"animationSpeed":1.5}')).toEqual({
      animationSpeed: 1.5,
    });
  });
});

describe('CredentialStore', () => {
  let creds: CredentialStore;
  let backing: Record<string, string>;

  beforeEach(() => {
    const mem = memoryStore();
    creds = new CredentialStore(mem.store);
    backing = mem.backing;
  });

  it('round-trips the access token', () => {
    expect(creds.loadToken()).toBeNull();
    creds.saveToken('tok');
    expect(backing[TOKEN_STORE_KEY]).toBe('tok');
    expect(creds.loadToken()).toBe('tok');
    creds.clearToken();
    expect(creds.loadToken()).toBeNull();
  });

  it('round-trips the last URL without clobbering other server settings', () => {
    backing[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({ other: 'keep' });
    creds.saveLastUrl('ws://host:1');
    const stored: unknown = JSON.parse(
      backing[STORAGE_KEY_SERVER_SETTINGS] ?? '{}',
    );
    expect(stored).toEqual({ other: 'keep', lastUrl: 'ws://host:1' });
    expect(creds.loadLastUrl()).toBe('ws://host:1');

    creds.clearLastUrl();
    expect(creds.loadLastUrl()).toBeUndefined();
    const afterClear: unknown = JSON.parse(
      backing[STORAGE_KEY_SERVER_SETTINGS] ?? '{}',
    );
    expect(afterClear).toEqual({ other: 'keep' });
  });

  it('tolerates corrupt server settings JSON', () => {
    backing[STORAGE_KEY_SERVER_SETTINGS] = 'not json';
    expect(creds.loadLastUrl()).toBeUndefined();
    creds.saveLastUrl('ws://host:2');
    expect(creds.loadLastUrl()).toBe('ws://host:2');
  });

  it('merges client settings additively', () => {
    creds.mergeClientSettings({ animationSpeed: 2 });
    creds.mergeClientSettings({ volumeAll: 0.5 });
    const stored: unknown = JSON.parse(
      backing[STORAGE_KEY_CLIENT_SETTINGS] ?? '{}',
    );
    expect(stored).toEqual({ animationSpeed: 2, volumeAll: 0.5 });
    expect(creds.loadClientSettings()).toEqual({
      animationSpeed: 2,
      volumeAll: 0.5,
    });
  });
});
