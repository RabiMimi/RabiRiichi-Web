/** Convert decimal score values without passing through floating point. */
export function toScore(
  value: number | bigint | string | { toString(): string } | null | undefined,
): bigint {
  if (value == null) return 0n;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new RangeError(
      'Score must be an exact integer; use a decimal string for large values',
    );
  }
  return BigInt(value.toString());
}

export function compareScoresDescending(a: bigint, b: bigint): number {
  return a > b ? -1 : a < b ? 1 : 0;
}
