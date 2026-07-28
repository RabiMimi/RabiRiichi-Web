import { describe, expect, it } from 'vitest';
import { canOfferUpdate } from './updateGate';

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
});
