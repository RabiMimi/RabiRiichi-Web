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

export interface ServerCredentials {
  token: string;
  username: string;
  nickname: string;
}

export const SERVER_CREDENTIALS_STORE_KEY = 'rabiriichi_server_credentials';

export class CredentialStore {
  private readonly logger = new Logger('CredentialStore');
  private readonly store: KeyValueStore;

  public constructor(store: KeyValueStore) {
    this.store = store;
  }

  private loadAllServerCredentials(): Record<string, ServerCredentials> {
    const raw = this.store.getItem(SERVER_CREDENTIALS_STORE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, ServerCredentials>;
    } catch {
      return {};
    }
  }

  private saveAllServerCredentials(all: Record<string, ServerCredentials>): void {
    if (Object.keys(all).length === 0) {
      this.store.removeItem(SERVER_CREDENTIALS_STORE_KEY);
    } else {
      this.store.setItem(SERVER_CREDENTIALS_STORE_KEY, JSON.stringify(all));
    }
  }

  public loadCredentialsForServer(url: string): ServerCredentials | null {
    const all = this.loadAllServerCredentials();
    let creds = all[url];
    if (!creds) {
      // Fallback: check if we can migrate from old keys
      const oldLastUrl = this.loadLastUrl();
      if (oldLastUrl === url) {
        const oldToken = this.store.getItem(TOKEN_STORE_KEY);
        if (oldToken) {
          const oldUsername = this.store.getItem(USERNAME_STORE_KEY) ?? '';
          creds = {
            token: oldToken,
            username: oldUsername,
            nickname: this.loadServerSettings().nickname || oldUsername || 'User',
          };
          all[url] = creds;
          this.saveAllServerCredentials(all);
          // Clean up old keys
          this.store.removeItem(TOKEN_STORE_KEY);
          if (oldUsername) {
            this.store.removeItem(USERNAME_STORE_KEY);
          }
        }
      }
    }
    return creds ?? null;
  }

  public saveCredentialsForServer(url: string, creds: ServerCredentials): void {
    const all = this.loadAllServerCredentials();
    all[url] = creds;
    this.saveAllServerCredentials(all);
  }

  public clearCredentialsForServer(url: string): void {
    const all = this.loadAllServerCredentials();
    if (all[url] === undefined) return;
    delete all[url];
    this.saveAllServerCredentials(all);
  }

  // Deprecated: kept for tests and compatibility
  public loadToken(): string | null {
    const lastUrl = this.loadLastUrl();
    if (lastUrl) {
      const creds = this.loadCredentialsForServer(lastUrl);
      if (creds) return creds.token;
    }
    return this.store.getItem(TOKEN_STORE_KEY);
  }

  public saveToken(token: string): void {
    const lastUrl = this.loadLastUrl();
    if (lastUrl) {
      const creds = this.loadCredentialsForServer(lastUrl) ?? { token: '', username: '', nickname: '' };
      creds.token = token;
      this.saveCredentialsForServer(lastUrl, creds);
    } else {
      this.store.setItem(TOKEN_STORE_KEY, token);
    }
  }

  public clearToken(): void {
    const lastUrl = this.loadLastUrl();
    if (lastUrl) {
      const creds = this.loadCredentialsForServer(lastUrl);
      if (creds) {
        creds.token = '';
        this.saveCredentialsForServer(lastUrl, creds);
      }
    } else {
      this.store.removeItem(TOKEN_STORE_KEY);
    }
  }

  public loadUsername(): string | null {
    const lastUrl = this.loadLastUrl();
    if (lastUrl) {
      const creds = this.loadCredentialsForServer(lastUrl);
      if (creds) return creds.username;
    }
    return this.store.getItem(USERNAME_STORE_KEY);
  }

  public saveUsername(username: string): void {
    const lastUrl = this.loadLastUrl();
    if (lastUrl) {
      const creds = this.loadCredentialsForServer(lastUrl) ?? { token: '', username: '', nickname: '' };
      creds.username = username;
      this.saveCredentialsForServer(lastUrl, creds);
    } else {
      this.store.setItem(USERNAME_STORE_KEY, username);
    }
  }

  public clearUsername(): void {
    const lastUrl = this.loadLastUrl();
    if (lastUrl) {
      const creds = this.loadCredentialsForServer(lastUrl);
      if (creds) {
        creds.username = '';
        this.saveCredentialsForServer(lastUrl, creds);
      }
    } else {
      this.store.removeItem(USERNAME_STORE_KEY);
    }
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
