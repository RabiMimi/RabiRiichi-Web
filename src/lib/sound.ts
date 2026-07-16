import { Howl } from 'howler';
import { rabiriichi } from '../net/client';

export interface AudioPlayback {
  stop(): void;
  onEnded(cb: () => void): void;
  setVolume(vol: number): void;
}

class SoundManager {
  private bgmAudio: Howl | null = null;
  private activeVoices = new Set<AudioPlayback>();
  private activeSEs = new Set<AudioPlayback>();

  constructor() {
    // Subscribe to store updates to dynamically adjust volumes
    if (typeof window !== 'undefined') {
      rabiriichi.onChange.subscribe(() => this.updateAllVolumes());
    }
  }

  private getEffectiveVolume(type: 'bgm' | 'se' | 'voice'): number {
    if (rabiriichi.sounds.muteAll) return 0;
    switch (type) {
      case 'bgm':
        return rabiriichi.sounds.muteBGM ? 0 : rabiriichi.sounds.volumeBGM;
      case 'se':
        return rabiriichi.sounds.muteSE ? 0 : rabiriichi.sounds.volumeSE;
      case 'voice':
        return rabiriichi.sounds.muteVoice ? 0 : rabiriichi.sounds.volumeVoice;
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

  /** Plays a character voice line. Stops any currently playing voice lines. */
  public playVoice(
    url: string,
    onEnded?: () => void,
    onError?: () => void,
  ): AudioPlayback | null {
    // Stop all active voice lines before playing a new one
    this.stopAllVoices();

    if (url.startsWith('data:audio/wav;base64')) {
      let timerId: ReturnType<typeof setTimeout> | null = null;
      const endedCallbacks = new Set<() => void>();

      const triggerEnd = () => {
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
        this.activeVoices.delete(mockPlayback);
        mockPlayback.stop();
      }, 1000);

      this.activeVoices.add(mockPlayback);
      return mockPlayback;
    }

    try {
      const sound = new Howl({
        src: [url],
        volume: this.getEffectiveVolume('voice'),
      });

      const endedCallbacks = new Set<() => void>();
      const triggerEnd = () => {
        onEnded?.();
        for (const cb of endedCallbacks) {
          cb();
        }
      };

      const playback: AudioPlayback = {
        stop: () => {
          sound.stop();
          this.activeVoices.delete(playback);
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
        this.activeVoices.delete(playback);
        triggerEnd();
      });

      sound.on('stop', () => {
        this.activeVoices.delete(playback);
        triggerEnd();
      });

      sound.on('loaderror', () => {
        this.activeVoices.delete(playback);
        onError?.();
        triggerEnd();
      });

      sound.on('playerror', () => {
        this.activeVoices.delete(playback);
        onError?.();
        triggerEnd();
      });

      sound.play();
      this.activeVoices.add(playback);
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
  }
}

export const soundManager = new SoundManager();
