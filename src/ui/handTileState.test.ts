import { describe, expect, it } from 'vitest';
import { isTileDimmed } from './handTileState';

const dim = (
  traceId: number | null,
  playable: number[],
  callHighlight: number[] | null = null,
) =>
  isTileDimmed({
    traceId,
    callHighlightIds: callHighlight ? new Set(callHighlight) : null,
    playableIds: new Set(playable),
  });

describe('isTileDimmed', () => {
  it('leaves the hand alone during an ordinary discard', () => {
    // Every tile is legal, so nothing should look locked.
    const hand = [1, 2, 3];
    for (const traceId of hand) expect(dim(traceId, hand)).toBe(false);
  });

  it('dims everything but the drawn tile after riichi', () => {
    // Regression guard: dimming used to apply only while choosing the riichi
    // discard, so once riichi was committed the locked hand still looked live.
    const drawn = 99;
    expect(dim(drawn, [drawn])).toBe(false);
    expect(dim(1, [drawn])).toBe(true);
    expect(dim(2, [drawn])).toBe(true);
  });

  it('leaves the hand alone when it is not your turn', () => {
    expect(dim(1, [])).toBe(false);
  });

  it('spotlights the tiles a pending call would consume', () => {
    // The call highlight wins over the discard prompt.
    expect(dim(1, [1, 2, 3], [1, 2])).toBe(false);
    expect(dim(3, [1, 2, 3], [1, 2])).toBe(true);
  });

  it('dims nothing for a tile with no trace id', () => {
    expect(dim(null, [1])).toBe(false);
  });
});
