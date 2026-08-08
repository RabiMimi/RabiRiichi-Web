import type { ClientSettings } from './constants';

export class VisualsSettings {
  public characterId = 'mimi';
  public tooltipOnHandTiles = true;
  public tooltipOnRiverTiles = true;

  constructor(settings?: ClientSettings) {
    if (settings?.characterId) {
      this.characterId = settings.characterId;
    }
    if (settings?.tooltipOnHandTiles !== undefined) {
      this.tooltipOnHandTiles = settings.tooltipOnHandTiles;
    }
    if (settings?.tooltipOnRiverTiles !== undefined) {
      this.tooltipOnRiverTiles = settings.tooltipOnRiverTiles;
    }
  }

  public update(
    patch: Pick<
      ClientSettings,
      'characterId' | 'tooltipOnHandTiles' | 'tooltipOnRiverTiles'
    >,
  ): void {
    if (patch.characterId !== undefined) {
      this.characterId = patch.characterId;
    }
    if (patch.tooltipOnHandTiles !== undefined) {
      this.tooltipOnHandTiles = patch.tooltipOnHandTiles;
    }
    if (patch.tooltipOnRiverTiles !== undefined) {
      this.tooltipOnRiverTiles = patch.tooltipOnRiverTiles;
    }
  }

  public toJSON(): Pick<
    ClientSettings,
    'characterId' | 'tooltipOnHandTiles' | 'tooltipOnRiverTiles'
  > {
    return {
      characterId: this.characterId,
      tooltipOnHandTiles: this.tooltipOnHandTiles,
      tooltipOnRiverTiles: this.tooltipOnRiverTiles,
    };
  }
}

export class SoundsSettings {
  public volumeSE = 1.0;
  public volumeBGM = 1.0;
  public volumeVoice = 1.0;
  public volumeAll = 1.0;
  public muteSE = false;
  public muteBGM = false;
  public muteVoice = false;

  constructor(settings?: ClientSettings) {
    if (settings?.volumeSE !== undefined) this.volumeSE = settings.volumeSE;
    if (settings?.volumeBGM !== undefined) this.volumeBGM = settings.volumeBGM;
    if (settings?.volumeVoice !== undefined)
      this.volumeVoice = settings.volumeVoice;
    if (settings?.muteSE !== undefined) this.muteSE = settings.muteSE;
    if (settings?.muteBGM !== undefined) this.muteBGM = settings.muteBGM;
    if (settings?.muteVoice !== undefined) this.muteVoice = settings.muteVoice;
    if (settings?.volumeAll !== undefined) this.volumeAll = settings.volumeAll;
  }

  public update(
    patch: Pick<
      ClientSettings,
      | 'volumeSE'
      | 'volumeBGM'
      | 'volumeVoice'
      | 'muteSE'
      | 'muteBGM'
      | 'muteVoice'
      | 'volumeAll'
    >,
  ): void {
    if (patch.volumeSE !== undefined) this.volumeSE = patch.volumeSE;
    if (patch.volumeBGM !== undefined) this.volumeBGM = patch.volumeBGM;
    if (patch.volumeVoice !== undefined) this.volumeVoice = patch.volumeVoice;
    if (patch.muteSE !== undefined) this.muteSE = patch.muteSE;
    if (patch.muteBGM !== undefined) this.muteBGM = patch.muteBGM;
    if (patch.muteVoice !== undefined) this.muteVoice = patch.muteVoice;
    if (patch.volumeAll !== undefined) this.volumeAll = patch.volumeAll;
  }

  public toJSON(): Omit<ClientSettings, 'animationSpeed' | 'characterId'> {
    return {
      volumeSE: this.volumeSE,
      volumeBGM: this.volumeBGM,
      volumeVoice: this.volumeVoice,
      muteSE: this.muteSE,
      muteBGM: this.muteBGM,
      muteVoice: this.muteVoice,
      volumeAll: this.volumeAll,
    };
  }
}
