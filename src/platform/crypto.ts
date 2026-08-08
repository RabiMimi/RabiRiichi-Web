/**
 * Platform-agnostic cryptographic hashing abstraction.
 *
 * Password hashing needs SHA-256. On the web this uses the Web Crypto API
 * (`crypto.subtle`); a Node/CLI host can supply an implementation backed by
 * `node:crypto`'s `webcrypto`. The interface is intentionally tiny — only what
 * the client's password flow requires.
 */
import { sha256 } from '../lib/crypto';

export interface CryptoProvider {
  /** Returns the lowercase hex SHA-256 digest of `message`. */
  sha256(message: string): Promise<string>;
}

/** Default provider backed by the ambient Web Crypto API (`crypto.subtle`). */
export const browserCryptoProvider: CryptoProvider = { sha256 };
