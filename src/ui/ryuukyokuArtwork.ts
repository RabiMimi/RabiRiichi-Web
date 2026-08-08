import i18n from '../lib/i18n';

/**
 * Banner artwork for abortive (mid-game) draws.
 *
 * Keys are the server's `midGameRyuukyoku.name` values (see
 * `RabiRiichi/Events/InGame/RyuukyokuEvent.cs`). The exhaustive draw
 * (`end_game_ryuukyoku`) deliberately has no artwork — it falls back to the
 * animated text banner.
 */
const RYUUKYOKU_ASSET_KEYS: Record<string, string> = {
  suufon_renda: 'assets.ui.suufon_renda',
  kyuushu_kyuuhai: 'assets.ui.kyuushu_kyuuhai',
  suucha_riichi: 'assets.ui.suucha_riichi',
  triple_ron: 'assets.ui.triple_ron',
  suukan_sanra: 'assets.ui.suukan_sanra',
};

/** Returns the banner image for a draw reason, or null if it has none. */
export function getRyuukyokuArtwork(
  reason: string | null | undefined,
): string | null {
  if (!reason) return null;
  const key = RYUUKYOKU_ASSET_KEYS[reason];
  if (!key) return null;
  return i18n.t(key);
}

/**
 * Whether a draw reason renders as artwork.
 *
 * The text banner uses this to stand down, so a draw never announces itself
 * twice (once as artwork, once as text).
 */
export function hasRyuukyokuArtwork(
  reason: string | null | undefined,
): boolean {
  if (!reason) return false;
  return reason in RYUUKYOKU_ASSET_KEYS;
}
