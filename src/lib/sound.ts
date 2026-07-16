import { rabiriichi } from '../net/client';

class SoundManager {
  private bgmAudio: HTMLAudioElement | null = null;
  private activeVoices = new Set<HTMLAudioElement>();
  private activeSEs = new Set<HTMLAudioElement>();

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
      this.bgmAudio.volume = this.getEffectiveVolume('bgm');
    }
    const voiceVol = this.getEffectiveVolume('voice');
    for (const voice of this.activeVoices) {
      voice.volume = voiceVol;
    }
    const seVol = this.getEffectiveVolume('se');
    for (const se of this.activeSEs) {
      se.volume = seVol;
    }
  }

  /** Plays background music (loops). Stops any currently playing BGM. */
  public playBGM(url: string): void {
    this.stopBGM();
    try {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = this.getEffectiveVolume('bgm');
      this.bgmAudio = audio;
      audio.play().catch((err) => {
        console.warn(
          'Failed to autoplay BGM (requires user interaction first):',
          err,
        );
      });
    } catch (e) {
      console.error('Failed to create Audio for BGM:', e);
    }
  }

  public stopBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio = null;
    }
  }

  /** Plays a one-shot sound effect. */
  public playSE(url: string): HTMLAudioElement | null {
    try {
      const audio = new Audio(url);
      audio.volume = this.getEffectiveVolume('se');
      this.activeSEs.add(audio);
      audio.addEventListener('ended', () => {
        this.activeSEs.delete(audio);
      });
      audio.play().catch(() => undefined);
      return audio;
    } catch {
      return null;
    }
  }

  /** Plays a character voice line. Stops any currently playing voice lines. */
  public playVoice(
    url: string,
    onEnded?: () => void,
    onError?: () => void,
  ): HTMLAudioElement | null {
    // Stop all active voice lines before playing a new one
    this.stopAllVoices();

    try {
      const audio = new Audio(url);
      audio.volume = this.getEffectiveVolume('voice');
      this.activeVoices.add(audio);

      const cleanUp = () => {
        this.activeVoices.delete(audio);
      };

      audio.addEventListener('ended', () => {
        cleanUp();
        onEnded?.();
      });

      audio.addEventListener('pause', () => {
        cleanUp();
        onEnded?.();
      });

      audio.addEventListener('error', () => {
        cleanUp();
        onError?.();
      });

      audio.play().catch((err) => {
        console.warn('Failed to play voice line:', err);
        cleanUp();
        onError?.();
      });

      return audio;
    } catch (e) {
      console.error('Failed to create Audio for voice line:', e);
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

      const audio = this.playVoice(url, handleEnd, handleEnd);
      if (!audio) {
        setTimeout(resolve, 1000);
      }
    });
  }

  public stopAllVoices(): void {
    for (const voice of this.activeVoices) {
      voice.pause();
    }
    this.activeVoices.clear();
  }
}

export const soundManager = new SoundManager();
