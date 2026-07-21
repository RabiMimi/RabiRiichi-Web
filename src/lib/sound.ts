import { Howl } from 'howler';
import type { SoundsSettings } from '../domain/settings';
import type { SoundEffect } from './soundEffects';

export interface AudioPlayback {
  stop(): void;
  onEnded(cb: () => void): void;
  setVolume(vol: number): void;
}

export class SoundManager {
  private bgmAudio: Howl | null = null;
  private activeVoices = new Set<AudioPlayback>();
  private readonly activeVoiceChannels = new Map<string, AudioPlayback>();
  private readonly voiceAudio = new Map<string, Howl>();
  private activeSEs = new Set<AudioPlayback>();
  private activeEffects = new Map<SoundEffect, AudioPlayback>();
  private volumeProvider: (() => SoundsSettings) | null = null;

  public setVolumeProvider(provider: () => SoundsSettings): void {
    this.volumeProvider = provider;
    this.updateAllVolumes();
  }

  private getEffectiveVolume(type: 'bgm' | 'se' | 'voice'): number {
    const sounds = this.volumeProvider?.();
    if (!sounds) return 0;
    const globalVol = sounds.volumeAll;
    switch (type) {
      case 'bgm':
        return (sounds.muteBGM ? 0 : sounds.volumeBGM) * globalVol;
      case 'se':
        return (sounds.muteSE ? 0 : sounds.volumeSE) * globalVol;
      case 'voice':
        return (sounds.muteVoice ? 0 : sounds.volumeVoice) * globalVol;
    }
  }

  public updateAllVolumes(): void {
    if (this.bgmAudio) {
      this.bgmAudio.volume(this.getEffectiveVolume('bgm'));
    }
    const voiceVol = this.getEffectiveVolume('voice');
    for (const playback of this.activeVoices) {
      playback.setVolume(voiceVol);
    }
    const seVol = this.getEffectiveVolume('se');
    for (const playback of this.activeSEs) {
      playback.setVolume(seVol);
    }
  }

  /** Plays background music (loops). Stops any currently playing BGM. */
  public playBGM(url: string): void {
    this.stopBGM();
    try {
      const sound = new Howl({
        src: [url],
        loop: true,
        volume: this.getEffectiveVolume('bgm'),
        html5: true, // Stream larger files like BGMs
      });
      this.bgmAudio = sound;
      sound.play();
    } catch (e) {
      console.error('Failed to create Howl for BGM:', e);
    }
  }

  public stopBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.stop();
      this.bgmAudio.unload();
      this.bgmAudio = null;
    }
  }

  /** Plays a one-shot sound effect. */
  public playSE(url: string): AudioPlayback | null {
    try {
      const sound = new Howl({
        src: [url],
        volume: this.getEffectiveVolume('se'),
      });

      const endedCallbacks = new Set<() => void>();
      const triggerEnd = () => {
        for (const cb of endedCallbacks) {
          cb();
        }
      };

      const playback: AudioPlayback = {
        stop: () => {
          sound.stop();
          this.activeSEs.delete(playback);
          triggerEnd();
        },
        onEnded: (cb) => {
          endedCallbacks.add(cb);
        },
        setVolume: (vol) => {
          sound.volume(vol);
        },
      };

      sound.on('end', () => {
        this.activeSEs.delete(playback);
        triggerEnd();
      });

      sound.on('stop', () => {
        this.activeSEs.delete(playback);
        triggerEnd();
      });

      sound.on('playerror', () => {
        this.activeSEs.delete(playback);
        triggerEnd();
      });

      sound.play();
      this.activeSEs.add(playback);
      return playback;
    } catch {
      return null;
    }
  }

  /** Plays a named gameplay sound effect from the shared public catalog. */
  public playEffect(effect: SoundEffect): AudioPlayback | null {
    this.activeEffects.get(effect)?.stop();

    const playback = this.playSE(effect);
    if (!playback) return null;

    this.activeEffects.set(effect, playback);
    playback.onEnded(() => {
      if (this.activeEffects.get(effect) === playback) {
        this.activeEffects.delete(effect);
      }
    });
    return playback;
  }

  public stopEffect(effect: SoundEffect): void {
    this.activeEffects.get(effect)?.stop();
  }

  public preloadVoices(urls: readonly string[]): void {
    for (const url of urls) {
      if (!url.startsWith('data:') && !this.voiceAudio.has(url)) {
        this.voiceAudio.set(
          url,
          new Howl({
            src: [url],
            volume: this.getEffectiveVolume('voice'),
            preload: true,
          }),
        );
      }
    }
  }

  public getVoiceDurationMs(url: string | undefined, fallbackMs = 800): number {
    if (!url || url.startsWith('data:')) return fallbackMs;
    const durationSeconds = this.voiceAudio.get(url)?.duration() ?? 0;
    return durationSeconds > 0 ? durationSeconds * 1000 : fallbackMs;
  }

  /** Plays a voice line, replacing all voices or only its named channel. */
  public playVoice(
    url: string,
    onEnded?: () => void,
    onError?: () => void,
    channel?: string,
  ): AudioPlayback | null {
    if (channel === undefined) {
      this.stopAllVoices();
    } else {
      this.activeVoiceChannels.get(channel)?.stop();
    }

    if (url.startsWith('data:audio/wav;base64')) {
      let timerId: ReturnType<typeof setTimeout> | null = null;
      const endedCallbacks = new Set<() => void>();
      let finalized = false;

      const triggerEnd = () => {
        if (finalized) return;
        finalized = true;
        this.activeVoices.delete(mockPlayback);
        if (channel && this.activeVoiceChannels.get(channel) === mockPlayback) {
          this.activeVoiceChannels.delete(channel);
        }
        onEnded?.();
        for (const cb of endedCallbacks) {
          cb();
        }
      };

      const mockPlayback: AudioPlayback = {
        stop: () => {
          if (timerId) {
            clearTimeout(timerId);
            timerId = null;
          }
          triggerEnd();
        },
        onEnded: (cb) => {
          endedCallbacks.add(cb);
        },
        setVolume: (_vol) => undefined,
      };

      timerId = setTimeout(() => {
        mockPlayback.stop();
      }, 1000);

      this.activeVoices.add(mockPlayback);
      if (channel) this.activeVoiceChannels.set(channel, mockPlayback);
      return mockPlayback;
    }

    try {
      let sound = this.voiceAudio.get(url);
      if (!sound) {
        sound = new Howl({ src: [url], preload: true });
        this.voiceAudio.set(url, sound);
      }
      sound.volume(this.getEffectiveVolume('voice'));

      const endedCallbacks = new Set<() => void>();
      let soundId: number | null = null;
      let finalized = false;
      const finalize = (failed = false) => {
        if (finalized) return;
        finalized = true;
        this.activeVoices.delete(playback);
        if (channel && this.activeVoiceChannels.get(channel) === playback) {
          this.activeVoiceChannels.delete(channel);
        }
        if (failed) onError?.();
        onEnded?.();
        for (const cb of endedCallbacks) cb();
      };

      const playback: AudioPlayback = {
        stop: () => {
          if (finalized) return;
          if (soundId !== null) sound.stop(soundId);
          finalize();
        },
        onEnded: (cb) => endedCallbacks.add(cb),
        setVolume: (vol) => {
          if (soundId !== null) sound.volume(vol, soundId);
        },
      };

      soundId = sound.play();
      sound.once('end', () => finalize(), soundId);
      sound.once('stop', () => finalize(), soundId);
      sound.once('loaderror', () => finalize(true), soundId);
      sound.once('playerror', () => finalize(true), soundId);
      this.activeVoices.add(playback);
      if (channel) this.activeVoiceChannels.set(channel, playback);
      return playback;
    } catch (e) {
      console.error('Failed to create Howl for voice line:', e);
      onError?.();
      return null;
    }
  }

  /** Plays a character voice line sequentially, returning a promise that resolves when it ends, pauses, errors, or after a fallback timeout. */
  public playVoicePromise(url: string | undefined): Promise<void> {
    return new Promise<void>((resolve) => {
      // Base64 silent WAV url or undefined
      if (!url || url.startsWith('data:audio/wav;base64')) {
        setTimeout(resolve, 1000);
        return;
      }

      let resolved = false;
      const handleEnd = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      const playback = this.playVoice(url, handleEnd, handleEnd);
      if (!playback) {
        setTimeout(resolve, 1000);
      }
    });
  }

  public stopAllVoices(): void {
    for (const playback of this.activeVoices) {
      playback.stop();
    }
    this.activeVoices.clear();
    this.activeVoiceChannels.clear();
  }
}

export const soundManager = new SoundManager();
