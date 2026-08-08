/**
 * Browser {@link GameSoundPlayer} backed by the `howler` sound manager.
 *
 * Kept separate from {@link ./sound} so the platform-agnostic interface can be
 * imported by the core without pulling in `howler`. Only web composition roots
 * import this adapter.
 */
import type { GameSoundPlayer } from './sound';
import { soundManager } from '../lib/sound';

export const browserSoundPlayer: GameSoundPlayer = {
  preloadVoices: (urls) => soundManager.preloadVoices(urls),
  playEffect: (effect) => {
    soundManager.playEffect(effect);
  },
  playVoice: (url, channel) => {
    soundManager.playVoice(url, undefined, undefined, channel);
  },
  stopEffect: (effect) => soundManager.stopEffect(effect),
  updateAllVolumes: () => soundManager.updateAllVolumes(),
  setVolumeProvider: (provider) => soundManager.setVolumeProvider(provider),
};
