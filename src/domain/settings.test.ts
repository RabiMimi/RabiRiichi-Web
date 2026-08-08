import { describe, it, expect } from 'vitest';
import { VisualsSettings, SoundsSettings } from './settings';

describe('VisualsSettings', () => {
  it('should initialize with default value', () => {
    const s = new VisualsSettings();
    expect(s.characterId).toBe('mimi');
  });

  it('should initialize with provided client settings', () => {
    const s = new VisualsSettings({ characterId: 'another' });
    expect(s.characterId).toBe('another');
  });

  it('should update characterId via update method', () => {
    const s = new VisualsSettings();
    s.update({ characterId: 'koko' });
    expect(s.characterId).toBe('koko');
  });

  it('should serialize correctly to JSON', () => {
    const s = new VisualsSettings({ characterId: 'mimi' });
    expect(s.toJSON()).toEqual({
      characterId: 'mimi',
      tooltipOnHandTiles: true,
      tooltipOnRiverTiles: true,
    });
  });
});

describe('SoundsSettings', () => {
  it('should initialize with default values', () => {
    const s = new SoundsSettings();
    expect(s.volumeSE).toBe(1.0);
    expect(s.volumeBGM).toBe(1.0);
    expect(s.volumeVoice).toBe(1.0);
    expect(s.muteSE).toBe(false);
    expect(s.muteBGM).toBe(false);
    expect(s.muteVoice).toBe(false);
    expect(s.volumeAll).toBe(1.0);
  });

  it('should initialize with customized client settings', () => {
    const s = new SoundsSettings({
      volumeSE: 0.5,
      volumeBGM: 0.2,
      muteVoice: true,
    });
    expect(s.volumeSE).toBe(0.5);
    expect(s.volumeBGM).toBe(0.2);
    expect(s.volumeVoice).toBe(1.0); // unchanged
    expect(s.muteSE).toBe(false);
    expect(s.muteVoice).toBe(true);
  });

  it('should update properties via update method', () => {
    const s = new SoundsSettings();
    s.update({ volumeSE: 0.7, volumeAll: 0.5 });
    expect(s.volumeSE).toBe(0.7);
    expect(s.volumeAll).toBe(0.5);
    expect(s.volumeBGM).toBe(1.0); // unchanged
  });

  it('should serialize correctly to JSON', () => {
    const s = new SoundsSettings({
      volumeSE: 0.4,
      volumeBGM: 0.5,
      volumeVoice: 0.6,
      muteSE: true,
      muteBGM: false,
      muteVoice: true,
      volumeAll: 0.8,
    });
    expect(s.toJSON()).toEqual({
      volumeSE: 0.4,
      volumeBGM: 0.5,
      volumeVoice: 0.6,
      muteSE: true,
      muteBGM: false,
      muteVoice: true,
      volumeAll: 0.8,
    });
  });
});
