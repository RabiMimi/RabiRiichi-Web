import { describe, expect, it } from 'vitest';
import { SOUND_EFFECTS } from './soundEffects';

describe('SOUND_EFFECTS', () => {
  it('uses one stable public URL for every gameplay effect', () => {
    const effects = Object.values(SOUND_EFFECTS).flatMap((group) =>
      Object.values(group),
    );

    expect(effects).toHaveLength(10);
    expect(new Set(effects).size).toBe(effects.length);
    expect(
      effects.every((effect) => effect.startsWith('/assets/sounds/se/')),
    ).toBe(true);
  });
});
