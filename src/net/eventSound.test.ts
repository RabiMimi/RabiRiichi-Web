import { describe, it, expect } from 'vitest';
import { soundEffectForEvent } from './eventSound';
import { SOUND_EFFECTS } from '../lib/soundEffects';

describe('soundEffectForEvent', () => {
  it('maps each sound-bearing event to its effect', () => {
    expect(soundEffectForEvent({ discardTileEvent: {} })).toBe(
      SOUND_EFFECTS.tile.discard,
    );
    expect(soundEffectForEvent({ agariEvent: {} })).toBe(
      SOUND_EFFECTS.game.agari,
    );
    expect(soundEffectForEvent({ revealDoraEvent: {} })).toBe(
      SOUND_EFFECTS.game.doraReveal,
    );
    expect(soundEffectForEvent({ setRiichiEvent: {} })).toBe(
      SOUND_EFFECTS.game.riichi,
    );
  });

  it('returns null for events with no associated effect', () => {
    expect(soundEffectForEvent({ drawTileEvent: {} })).toBeNull();
    expect(soundEffectForEvent({ dealHandEvent: {} })).toBeNull();
    expect(soundEffectForEvent({})).toBeNull();
  });

  it('prioritizes discard when multiple flags are present', () => {
    // Defensive: real events carry one oneof case, but the mapper should be
    // deterministic if given more than one.
    expect(soundEffectForEvent({ discardTileEvent: {}, agariEvent: {} })).toBe(
      SOUND_EFFECTS.tile.discard,
    );
  });
});
