/**
 * Pure mapping from a game event to the sound effect it should trigger.
 *
 * Kept separate from the session orchestrator and from any audio engine so the
 * mapping is trivially unit-testable and so non-audio hosts can ignore it
 * entirely (by using a no-op sound player). Returns `null` when an event has no
 * associated one-shot effect.
 */
import type { IEventMsg } from '../proto';
import { SOUND_EFFECTS, type SoundEffect } from '../lib/soundEffects';

/**
 * The one-shot effect for a game event, or `null` if none.
 *
 * Note: the deal sound is intentionally excluded here because it is gated by
 * per-hand dealing state owned by the session; see the client's deal handling.
 */
export function soundEffectForEvent(gameEvent: IEventMsg): SoundEffect | null {
  if (gameEvent.discardTileEvent) {
    return SOUND_EFFECTS.tile.discard;
  }
  if (gameEvent.agariEvent) {
    return SOUND_EFFECTS.game.agari;
  }
  if (gameEvent.revealDoraEvent) {
    return SOUND_EFFECTS.game.doraReveal;
  }
  if (gameEvent.setRiichiEvent) {
    return SOUND_EFFECTS.game.riichi;
  }
  return null;
}
