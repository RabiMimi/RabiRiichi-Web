/**
 * Platform-agnostic gameplay sound abstraction.
 *
 * The client triggers short sound effects in response to game events (discard,
 * agari, riichi, timeout warning, etc.). On the web these are played via the
 * `howler`-backed sound manager; a CLI host has no audio and uses the no-op
 * default. This interface captures only the surface the client needs, keeping
 * the full audio engine out of the platform-agnostic core.
 */
import type { SoundEffect } from '../lib/soundEffects';
import type { SoundsSettings } from '../domain/settings';

export interface GameSoundPlayer {
  /** Begins loading character voices so event playback can start immediately. */
  preloadVoices(urls: readonly string[]): void;
  /** Plays a named one-shot gameplay sound effect. */
  playEffect(effect: SoundEffect): void;
  /** Plays a character voice, interrupting any voice already in progress. */
  playVoice(url: string): void;
  /** Stops a currently-playing named effect (e.g. the timeout warning loop). */
  stopEffect(effect: SoundEffect): void;
  /** Re-applies volume settings to all active playback. */
  updateAllVolumes(): void;
  /** Registers the live source of volume settings the player should honor. */
  setVolumeProvider(provider: () => SoundsSettings): void;
}

/** A sound player that ignores every call. Used by non-audio hosts (CLI). */
export const nullSoundPlayer: GameSoundPlayer = {
  preloadVoices: () => undefined,
  playEffect: () => undefined,
  playVoice: () => undefined,
  stopEffect: () => undefined,
  updateAllVolumes: () => undefined,
  setVolumeProvider: () => undefined,
};
