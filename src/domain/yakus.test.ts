import { describe, it, expect } from 'vitest';
import { YAKUS, buildAllowedYakusPayload } from './yakus';

describe('buildAllowedYakusPayload', () => {
  it('sends the full list when every yaku is enabled (not an empty array)', () => {
    // Regression: an empty array is read by the server as "ban every yaku",
    // which made hands yakuless even though the user enabled all yakus.
    const all = new Set(YAKUS.map((y) => y.name));

    const payload = buildAllowedYakusPayload(all);

    expect(payload).toHaveLength(YAKUS.length);
    expect(payload.length).toBeGreaterThan(0);
    expect(new Set(payload)).toEqual(all);
  });

  it('sends only the selected subset', () => {
    const selected = new Set(['Riichi', 'Tanyao']);

    const payload = buildAllowedYakusPayload(selected);

    expect(new Set(payload)).toEqual(selected);
  });

  it('sends an empty list only when nothing is selected', () => {
    expect(buildAllowedYakusPayload(new Set())).toEqual([]);
  });
});
