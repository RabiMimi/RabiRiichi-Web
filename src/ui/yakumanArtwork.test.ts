import { describe, expect, it } from 'vitest';
import { getYakumanArtwork } from './yakumanArtwork';

describe('getYakumanArtwork', () => {
  it('shows nothing when there is no yakuman in sight', () => {
    expect(getYakumanArtwork(null)).toBeNull();
  });

  it('uses a single image for a chance', () => {
    const art = getYakumanArtwork('chance');
    expect(art?.src).toMatch(/yakuman_chance/);
    expect(art?.glowSrc).toBeUndefined();
  });

  it('layers the gold wordmark over the plain one when confirmed', () => {
    // Both assets are the same wordmark; the gold one is the flare layer, not
    // a separate banner for a bigger yakuman.
    const art = getYakumanArtwork('confirmed');
    expect(art?.src).toMatch(/yakuman_confirmed/);
    expect(art?.glowSrc).toMatch(/yakuman_confirmed_gold/);
    expect(art?.src).not.toBe(art?.glowSrc);
  });
});
