import type { InquiryOptionType } from '../domain/inquiry';

/**
 * Artwork i18n key per action, or null for the ones the action panel never
 * renders. Declared exhaustively so adding an action type fails to compile
 * until its artwork is decided, instead of silently falling back to a
 * plain-text button.
 */
export const ACTION_ASSET_KEYS: Record<InquiryOptionType, string | null> = {
  chii: 'assets.ui.chii',
  pon: 'assets.ui.pon',
  kan: 'assets.ui.kan',
  riichi: 'assets.ui.riichi',
  agari: 'assets.ui.ron',
  nukidora: 'assets.ui.nukidora',
  skip: 'assets.ui.skip',
  // 九種九牌 is the only draw a player can declare (see RyuukyokuResolver).
  ryuukyoku: 'assets.ui.kyuushu_kyuuhai',
  // Tiles are picked from the hand, not from the action panel.
  'play-tile': null,
  // Filtered out before the action panel renders.
  'next-round': null,
};

/** Action types the action panel can show a button for. */
export const RENDERED_ACTION_TYPES = Object.keys(ACTION_ASSET_KEYS).filter(
  (type): type is InquiryOptionType =>
    type !== 'play-tile' && type !== 'next-round',
);

/**
 * Artwork key for an action. `override` lets a caller pick between two images
 * for one type, e.g. tsumo instead of ron.
 */
export function getActionAssetKey(
  type: InquiryOptionType,
  override?: string,
): string | null {
  return override ?? ACTION_ASSET_KEYS[type];
}
