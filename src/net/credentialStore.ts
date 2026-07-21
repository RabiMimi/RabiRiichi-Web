/**
 * Persistence for connection credentials and client settings.
 *
 * Wraps a platform {@link KeyValueStore} with typed, error-tolerant accessors
 * for the handful of values the client persists: the access token, the last
 * server URL, and the JSON blob of client settings. Centralizing this here
 * keeps storage concerns out of the session orchestrator and lets a CLI host
 * back it with any store (file, memory) by swapping the underlying platform.
 */
import { Logger } from '../lib';
import type { KeyValueStore } from '../platform/storage';
import {
  STORAGE_KEY_SERVER_SETTINGS,
  STORAGE_KEY_CLIENT_SETTINGS,
  type ServerSettings,
  type ClientSettings,
} from '../domain/constants';

export const TOKEN_STORE_KEY = 'rabiriichi_token';
export const USERNAME_STORE_KEY = 'rabiriichi_username';

// Parses persisted client settings from a raw store string. Returns an empty
// object for missing/corrupt data so callers can merge safely.
export function parseClientSettings(raw: string | null): ClientSettings {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    // ClientSettings has only optional fields, so any object satisfies it;
    // unknown extra keys are harmless.
    return parsed;
  } catch {
    return {};
  }
}

export class CredentialStore {
  private readonly logger = new Logger('CredentialStore');
  private readonly store: KeyValueStore;

  public constructor(store: KeyValueStore) {
    this.store = store;
  }

  public loadToken(): string | null {
    return this.store.getItem(TOKEN_STORE_KEY);
  }

  public saveToken(token: string): void {
    this.store.setItem(TOKEN_STORE_KEY, token);
  }

  public clearToken(): void {
    this.store.removeItem(TOKEN_STORE_KEY);
  }

  // The login username is persisted so a password change (which is verified by
  // the old password over the public socket) works even after a token-only
  // reconnect, when the username would otherwise be unrecoverable.
  public loadUsername(): string | null {
    return this.store.getItem(USERNAME_STORE_KEY);
  }

  public saveUsername(username: string): void {
    this.store.setItem(USERNAME_STORE_KEY, username);
  }

  public clearUsername(): void {
    this.store.removeItem(USERNAME_STORE_KEY);
  }

  private loadServerSettings(): ServerSettings {
    const raw = this.store.getItem(STORAGE_KEY_SERVER_SETTINGS);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as ServerSettings;
    } catch {
      return {};
    }
  }

  public loadLastUrl(): string | undefined {
    return this.loadServerSettings().lastUrl;
  }

  public saveLastUrl(url: string): void {
    const settings = this.loadServerSettings();
    settings.lastUrl = url;
    this.store.setItem(STORAGE_KEY_SERVER_SETTINGS, JSON.stringify(settings));
  }

  public clearLastUrl(): void {
    const settings = this.loadServerSettings();
    if (settings.lastUrl === undefined) return;
    delete settings.lastUrl;
    this.store.setItem(STORAGE_KEY_SERVER_SETTINGS, JSON.stringify(settings));
  }

  public loadClientSettings(): ClientSettings {
    return parseClientSettings(this.store.getItem(STORAGE_KEY_CLIENT_SETTINGS));
  }

  public mergeClientSettings(patch: Partial<ClientSettings>): void {
    try {
      const settings = this.loadClientSettings();
      Object.assign(settings, patch);
      this.store.setItem(STORAGE_KEY_CLIENT_SETTINGS, JSON.stringify(settings));
    } catch (err) {
      this.logger.error('Failed to save client settings:', err);
    }
  }
}
