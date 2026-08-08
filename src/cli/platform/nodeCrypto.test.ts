import { describe, it, expect } from 'vitest';
import { nodeCryptoProvider } from './nodeCrypto';

describe('nodeCryptoProvider.sha256', () => {
  it('matches the known SHA-256 hex digest of "abc"', async () => {
    await expect(nodeCryptoProvider.sha256('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes the empty string', async () => {
    await expect(nodeCryptoProvider.sha256('')).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('produces lowercase hex of length 64', async () => {
    const digest = await nodeCryptoProvider.sha256('rabiriichi@salt');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
