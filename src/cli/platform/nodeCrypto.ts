/**
 * Node crypto provider (SHA-256) backed by `node:crypto`.
 *
 * Mirrors the browser provider's contract: returns the lowercase hex digest of
 * the input string. Used only for client-side password hashing.
 */
import { createHash } from 'node:crypto';
import type { CryptoProvider } from '../../platform/crypto';

export const nodeCryptoProvider: CryptoProvider = {
  sha256: (message: string): Promise<string> =>
    Promise.resolve(createHash('sha256').update(message, 'utf8').digest('hex')),
};
