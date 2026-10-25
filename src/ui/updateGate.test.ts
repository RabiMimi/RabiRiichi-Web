import { describe, expect, it } from 'vitest';
import {
  canOfferUpdate,
  ORIENTATION_GUARD_Z_INDEX,
  UPDATE_PROMPT_Z_INDEX,
} from './updateGate';

describe('canOfferUpdate', () => {
  it('offers on the connect and lobby screens, and in a room before the deal', () => {
    expect(canOfferUpdate({ isReplay: false, isInGame: false })).toBe(true);
  });

  it('never interrupts a game', () => {
    // Accepting reloads the page: mid-hand that costs the player their turn.
    expect(canOfferUpdate({ isReplay: false, isInGame: true })).toBe(false);
  });

  it('never interrupts a replay', () => {
    // Reloading restarts it, losing the viewer's position.
    expect(canOfferUpdate({ isReplay: true, isInGame: false })).toBe(false);
    expect(canOfferUpdate({ isReplay: true, isInGame: true })).toBe(false);
  });

  it('ensures update prompt z-index is higher than orientation guard', () => {
    // OrientationGuard is z-[9999]; UpdatePrompt must sit at z-[10000] or higher
    // so players who hold their phone in portrait can still see and tap the update chip.
    expect(UPDATE_PROMPT_Z_INDEX).toBeGreaterThan(ORIENTATION_GUARD_Z_INDEX);
  });
});
