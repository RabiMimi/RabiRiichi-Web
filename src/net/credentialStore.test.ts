import { describe, it, expect, beforeEach } from 'vitest';
import {
  CredentialStore,
  TOKEN_STORE_KEY,
  USERNAME_STORE_KEY,
  SERVER_CREDENTIALS_STORE_KEY,
  parseClientSettings,
  type ServerCredentials,
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

  it('round-trips the login username', () => {
    expect(creds.loadUsername()).toBeNull();
    creds.saveUsername('alice');
    expect(backing[USERNAME_STORE_KEY]).toBe('alice');
    expect(creds.loadUsername()).toBe('alice');
    creds.clearUsername();
    expect(creds.loadUsername()).toBeNull();
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

  describe('per-server credentials', () => {
    it('round-trips credentials per server url', () => {
      const url1 = 'ws://server1:5150';
      const url2 = 'ws://server2:5150';

      expect(creds.loadCredentialsForServer(url1)).toBeNull();

      creds.saveCredentialsForServer(url1, {
        token: 'token1',
        username: 'alice',
        nickname: 'Alice',
      });

      expect(creds.loadCredentialsForServer(url1)).toEqual({
        token: 'token1',
        username: 'alice',
        nickname: 'Alice',
      });
      expect(creds.loadCredentialsForServer(url2)).toBeNull();

      creds.saveCredentialsForServer(url2, {
        token: 'token2',
        username: 'bob',
        nickname: 'Bob',
      });

      expect(creds.loadCredentialsForServer(url2)).toEqual({
        token: 'token2',
        username: 'bob',
        nickname: 'Bob',
      });

      creds.clearCredentialsForServer(url1);
      expect(creds.loadCredentialsForServer(url1)).toBeNull();
      expect(creds.loadCredentialsForServer(url2)).toEqual({
        token: 'token2',
        username: 'bob',
        nickname: 'Bob',
      });

      creds.clearCredentialsForServer(url2);
      expect(backing[SERVER_CREDENTIALS_STORE_KEY]).toBeUndefined();
    });

    it('migrates legacy token and username when loading credentials for matching lastUrl', () => {
      const url = 'ws://legacy-server:5150';
      backing[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({
        lastUrl: url,
        nickname: 'LegacyNickname',
      });
      backing[TOKEN_STORE_KEY] = 'legacy-token';
      backing[USERNAME_STORE_KEY] = 'legacy-user';

      // Load for matching server URL -> triggers migration
      const migrated = creds.loadCredentialsForServer(url);
      expect(migrated).toEqual({
        token: 'legacy-token',
        username: 'legacy-user',
        nickname: 'LegacyNickname',
      });

      // Old keys should be removed
      expect(backing[TOKEN_STORE_KEY]).toBeUndefined();
      expect(backing[USERNAME_STORE_KEY]).toBeUndefined();

      // Mapped credentials are saved
      const storedMap = JSON.parse(
        backing[SERVER_CREDENTIALS_STORE_KEY] ?? '{}',
      ) as Record<string, ServerCredentials>;
      expect(storedMap[url]).toEqual({
        token: 'legacy-token',
        username: 'legacy-user',
        nickname: 'LegacyNickname',
      });
    });

    it('migrates legacy token-only credentials', () => {
      const url = 'ws://legacy-server:5150';
      backing[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({
        lastUrl: url,
      });
      backing[TOKEN_STORE_KEY] = 'legacy-token';

      const migrated = creds.loadCredentialsForServer(url);
      expect(migrated).toEqual({
        token: 'legacy-token',
        username: '',
        nickname: 'User',
      });

      expect(backing[TOKEN_STORE_KEY]).toBeUndefined();
    });

    it('does not migrate if lastUrl does not match the requested url', () => {
      const url1 = 'ws://server1:5150';
      const url2 = 'ws://server2:5150';
      backing[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({
        lastUrl: url1,
      });
      backing[TOKEN_STORE_KEY] = 'legacy-token';

      const credsForUrl2 = creds.loadCredentialsForServer(url2);
      expect(credsForUrl2).toBeNull();
      expect(backing[TOKEN_STORE_KEY]).toBe('legacy-token'); // not deleted
    });
  });
});
