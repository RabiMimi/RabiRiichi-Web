/**
 * When it is acceptable to interrupt the player with a "new version" offer.
 *
 * Taking an update means reloading, so it must never be offered mid-hand: the
 * client would drop its socket and rejoin, and the player would lose their turn
 * to the clock. Everything before a game starts is fair game, and a replay is
 * not, because reloading throws away the viewer's position in it.
 */
export interface UpdateGateState {
  /** Watching a replay rather than playing. */
  isReplay: boolean;
  /** A game is under way — the room has dealt in (`room.info` is set). */
  isInGame: boolean;
}

export function canOfferUpdate({
  isReplay,
  isInGame,
}: UpdateGateState): boolean {
  return !isReplay && !isInGame;
}
