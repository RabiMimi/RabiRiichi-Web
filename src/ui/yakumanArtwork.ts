import i18n from '../lib/i18n';
import type { YakumanOutlook } from '../domain/model';

export interface YakumanArtwork {
  src: string;
  /**
   * Overlay for the confirmed banner. The two assets are the same wordmark,
   * plain and gold; the gold flares over the plain one during the reveal.
   */
  glowSrc?: string;
}

/** Artwork for a yakuman announcement, or null when there is nothing to show. */
export function getYakumanArtwork(
  outlook: YakumanOutlook,
): YakumanArtwork | null {
  if (outlook === 'chance') {
    return { src: i18n.t('assets.ui.yakuman_chance') };
  }
  if (outlook === 'confirmed') {
    return {
      src: i18n.t('assets.ui.yakuman_confirmed'),
      glowSrc: i18n.t('assets.ui.yakuman_confirmed_gold'),
    };
  }
  return null;
}
