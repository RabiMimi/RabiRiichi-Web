/** Public certificate fingerprints only; the keystore never enters the web build. */
export function createAssetLinks(packageId: string, fingerprints: string[]) {
  const normalized = [
    ...new Set(fingerprints.map((value) => value.trim().toUpperCase())),
  ];
  if (normalized.length === 0) return [];
  if (
    !normalized.every((value) =>
      /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value),
    )
  ) {
    throw new Error(
      'Android certificate fingerprints must be colon-separated SHA-256 values.',
    );
  }
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageId,
        sha256_cert_fingerprints: normalized,
      },
    },
  ];
}
