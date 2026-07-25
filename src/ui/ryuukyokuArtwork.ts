/**
 * Banner artwork for abortive (mid-game) draws.
 *
 * Keys are the server's `midGameRyuukyoku.name` values (see
 * `RabiRiichi/Events/InGame/RyuukyokuEvent.cs`). The exhaustive draw
 * (`end_game_ryuukyoku`) deliberately has no artwork — it falls back to the
 * animated text banner.
 */
const RYUUKYOKU_IMAGES: Record<string, string> = {
  suufon_renda: '/assets/ui/四风连打.png',
  kyuushu_kyuuhai: '/assets/ui/九种九牌.png',
  suucha_riichi: '/assets/ui/四家立直.png',
  triple_ron: '/assets/ui/三家和了.png',
  suukan_sanra: '/assets/ui/四杠散了.png',
};

/** Returns the banner image for a draw reason, or null if it has none. */
export function getRyuukyokuArtwork(
  reason: string | null | undefined,
): string | null {
  if (!reason) return null;
  return RYUUKYOKU_IMAGES[reason] ?? null;
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
  return getRyuukyokuArtwork(reason) !== null;
}
