/**
 * Maps a player's server seat to a screen position index.
 *
 * Screen positions:
 * - 0: Bottom (Local player / Self)
 * - 1: Right (Opponent to the right)
 * - 2: Top (Opponent opposite)
 * - 3: Left (Opponent to the left)
 *
 * @param seat The player's server seat index (0-3).
 * @param selfSeat The local player's server seat index (0-3).
 * @param playerCount The total number of players in the game (2 or 4).
 */
export function getScreenPosition(
  seat: number,
  selfSeat: number,
  playerCount: number,
): number {
  if (playerCount === 2) {
    // In 2-player game, players sit opposite to each other.
    return seat === selfSeat ? 0 : 2;
  }
  // For 4-player game (standard rotation CCW)
  // Seat index increases counter-clockwise (East -> South -> West -> North).
  // Screen positions also increase counter-clockwise (Bottom -> Right -> Top -> Left).
  return (seat - selfSeat + 4) % 4;
}

/**
 * Returns the rotation angle (in radians) around the Y-axis for a given screen position.
 * Sits the elements of the player correctly oriented towards the table center.
 */
export function getSeatRotation(screenPos: number): number {
  // Screen positions:
  // 0: Bottom -> 0 rad
  // 1: Right  -> PI / 2 rad (90deg CCW)
  // 2: Top    -> PI rad (180deg)
  // 3: Left   -> -PI / 2 rad (270deg CCW / 90deg CW)
  return screenPos * (Math.PI / 2);
}
