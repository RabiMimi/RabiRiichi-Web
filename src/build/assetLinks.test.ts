import { describe, expect, it } from 'vitest';
import { createAssetLinks } from './assetLinks';

describe('Android Digital Asset Links', () => {
  const fingerprint = Array<string>(32).fill('AB').join(':');

  it('does not claim verification before a signing certificate is configured', () => {
    expect(createAssetLinks('com.rabimimi.riichi', [])).toEqual([]);
  });

  it('normalizes and deduplicates fingerprints and preserves the package identity', () => {
    expect(
      createAssetLinks('com.rabimimi.riichi', [
        fingerprint.toLowerCase(),
        ` ${fingerprint} `,
      ]),
    ).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.rabimimi.riichi',
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ]);
  });

  it.each(['', 'placeholder', 'AB:CD', 'GG:'.repeat(31) + 'GG'])(
    'rejects invalid certificates instead of publishing broken verification: %s',
    (invalid) => {
      expect(() =>
        createAssetLinks('com.rabimimi.riichi', [invalid]),
      ).toThrow();
    },
  );
});
