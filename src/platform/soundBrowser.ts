/**
 * Browser {@link GameSoundPlayer} backed by the `howler` sound manager.
 *
 * Kept separate from {@link ./sound} so the platform-agnostic interface can be
 * imported by the core without pulling in `howler`. Only web composition roots
 * import this adapter.
 */
import type { GameSoundPlayer } from './sound';
import { soundManager } from '../lib/sound';

/**
 * The shared sound manager already exposes exactly the methods
 * {@link GameSoundPlayer} requires; its `playEffect`/`stopEffect` return values
 * are structurally compatible with the `void`-returning interface.
 */
export const browserSoundPlayer: GameSoundPlayer = soundManager;
