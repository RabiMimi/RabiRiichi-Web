import { describe, it, expect, vi, afterEach } from 'vitest';
import { browserLocalStore, nullStore } from './storage';

describe('nullStore', () => {
  it('reads nothing and ignores writes', () => {
    expect(nullStore.getItem('anything')).toBeNull();
    expect(() => {
      nullStore.setItem('a', 'b');
      nullStore.removeItem('a');
    }).not.toThrow();
  });
});

describe('browserLocalStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes through to the global localStorage', () => {
    const backing: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => backing[k] ?? null,
      setItem: (k: string, v: string) => {
        backing[k] = v;
      },
      removeItem: (k: string) => {
        delete backing[k];
      },
    });

    browserLocalStore.setItem('key', 'value');
    expect(browserLocalStore.getItem('key')).toBe('value');
    browserLocalStore.removeItem('key');
    expect(browserLocalStore.getItem('key')).toBeNull();
  });

  it('no-ops safely when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(browserLocalStore.getItem('key')).toBeNull();
    expect(() => {
      browserLocalStore.setItem('key', 'value');
      browserLocalStore.removeItem('key');
    }).not.toThrow();
  });

  it('swallows errors thrown by localStorage (e.g. quota / private mode)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    });
    expect(browserLocalStore.getItem('key')).toBeNull();
    expect(() => {
      browserLocalStore.setItem('key', 'value');
      browserLocalStore.removeItem('key');
    }).not.toThrow();
  });
});
