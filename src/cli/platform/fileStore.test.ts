import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStore } from './fileStore';

describe('FileStore', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rabi-cli-store-'));
    path = join(dir, 'nested', 'config.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips values and persists to disk', () => {
    const store = new FileStore(path);
    expect(store.getItem('token')).toBeNull();

    store.setItem('token', 'abc');
    expect(store.getItem('token')).toBe('abc');

    // A fresh instance reads the persisted file (incl. lazily-created dirs).
    const reopened = new FileStore(path);
    expect(reopened.getItem('token')).toBe('abc');
  });

  it('removes values', () => {
    const store = new FileStore(path);
    store.setItem('a', '1');
    store.setItem('b', '2');
    store.removeItem('a');
    expect(store.getItem('a')).toBeNull();
    expect(store.getItem('b')).toBe('2');
    expect(new FileStore(path).getItem('a')).toBeNull();
  });

  it('writes pretty JSON containing only string values', () => {
    const store = new FileStore(path);
    store.setItem('k', 'v');
    const onDisk: unknown = JSON.parse(readFileSync(path, 'utf8'));
    expect(onDisk).toEqual({ k: 'v' });
  });

  it('tolerates a corrupt existing file by starting empty', () => {
    writeFileSync(path.replace('/nested', ''), 'not json', 'utf8');
    const store = new FileStore(path.replace('/nested', ''));
    expect(store.getItem('anything')).toBeNull();
    // ...and can still write.
    store.setItem('x', 'y');
    expect(store.getItem('x')).toBe('y');
  });

  it('ignores non-string values in an existing file', () => {
    writeFileSync(
      path.replace('/nested', ''),
      JSON.stringify({ a: 1, b: 'ok' }),
    );
    const store = new FileStore(path.replace('/nested', ''));
    expect(store.getItem('a')).toBeNull();
    expect(store.getItem('b')).toBe('ok');
  });
});
