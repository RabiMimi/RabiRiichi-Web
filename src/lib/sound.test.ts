import { describe, expect, it, vi } from 'vitest';

vi.mock('howler', () => ({
  Howl: class {
    public volume(): void {
      return undefined;
    }
    public play(): number {
      return 1;
    }
    public once(): void {
      return undefined;
    }
    public stop(): void {
      return undefined;
    }
  },
}));

import { SoundManager } from './sound';

describe('SoundManager voice channels', () => {
  it('keeps voices from different player channels playing', () => {
    const manager = new SoundManager();
    const currentPlayer = manager.playVoice(
      '/current.mp3',
      undefined,
      undefined,
      'player-0',
    );
    expect(currentPlayer).not.toBeNull();
    if (!currentPlayer) return;
    const stopCurrentPlayer = vi.spyOn(currentPlayer, 'stop');

    manager.playVoice('/other.mp3', undefined, undefined, 'player-1');
    expect(stopCurrentPlayer).not.toHaveBeenCalled();

    manager.playVoice('/current-next.mp3', undefined, undefined, 'player-0');
    expect(stopCurrentPlayer).toHaveBeenCalledOnce();
  });
});
