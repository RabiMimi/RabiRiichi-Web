export interface TileDimInput {
  traceId: number | null | undefined;
  /** Tiles a pending call would consume, or null when no call is offered. */
  callHighlightIds: ReadonlySet<number> | null;
  /** Tiles the current prompt accepts. Empty when it is not your turn. */
  playableIds: ReadonlySet<number>;
}

/**
 * Whether a hand tile should be greyed out.
 *
 * Dimming marks tiles the current prompt will not accept. That matters most
 * after declaring riichi, where the server offers only the drawn tile and the
 * rest of the hand is locked; during ordinary play every tile is legal and
 * nothing dims.
 */
export function isTileDimmed({
  traceId,
  callHighlightIds,
  playableIds,
}: TileDimInput): boolean {
  if (traceId == null) return false;
  // A pending call spotlights the tiles it would consume, and takes precedence
  // over the discard prompt.
  if (callHighlightIds != null) return !callHighlightIds.has(traceId);
  // With nothing to answer there is no "illegal" tile, so leave the hand alone.
  if (playableIds.size === 0) return false;
  return !playableIds.has(traceId);
}
