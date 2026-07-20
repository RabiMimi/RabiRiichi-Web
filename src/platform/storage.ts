/**
 * Platform-agnostic key/value persistence abstraction.
 *
 * The client persists a few small strings (server URL, access token, client
 * settings JSON). On the web this is backed by `localStorage`; a CLI host can
 * back it with a file or an in-memory store. The interface mirrors the subset
 * of the `localStorage` API the client uses so the browser default is a direct
 * pass-through.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** A store that discards all writes and returns nothing. */
export const nullStore: KeyValueStore = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

/**
 * Default store backed by the ambient global `localStorage`.
 *
 * Each operation resolves `localStorage` lazily and no-ops safely when it is
 * unavailable (e.g. SSR, Node) or throws (e.g. private-mode quota errors),
 * preserving the pre-existing `typeof localStorage !== 'undefined'` guards that
 * were previously scattered through the client.
 */
export const browserLocalStore: KeyValueStore = {
  getItem: (key) => {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, value);
    } catch {
      // ignore (unavailable or quota exceeded)
    }
  },
  removeItem: (key) => {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
