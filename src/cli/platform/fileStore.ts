/**
 * File-backed {@link KeyValueStore} for the CLI.
 *
 * The client persists a handful of small strings (access token, last server
 * URL, client settings JSON) through a synchronous key/value interface. This
 * store keeps an in-memory cache loaded from a JSON file and writes the whole
 * file back on each mutation. Failures are swallowed so a read-only or missing
 * config directory never crashes the app (matching the browser store's
 * error-tolerant behavior).
 *
 * The file holds a flat `{ [key]: string }` object and is created lazily on the
 * first successful write.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { KeyValueStore } from '../../platform/storage';

function loadFile(path: string): Record<string, string> {
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') result[k] = v;
    }
    return result;
  } catch {
    // Missing or corrupt file: start empty.
    return {};
  }
}

export class FileStore implements KeyValueStore {
  private readonly path: string;
  private readonly cache: Record<string, string>;

  public constructor(path: string) {
    this.path = path;
    this.cache = loadFile(path);
  }

  public getItem(key: string): string | null {
    return this.cache[key] ?? null;
  }

  public setItem(key: string, value: string): void {
    this.cache[key] = value;
    this.flush();
  }

  public removeItem(key: string): void {
    if (!(key in this.cache)) return;
    delete this.cache[key];
    this.flush();
  }

  private flush(): void {
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      writeFileSync(this.path, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch {
      // Best-effort persistence; ignore write failures (read-only FS, etc.).
    }
  }
}
