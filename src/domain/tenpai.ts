import type {
  IGameTileMsg,
  IMenLikeMsg,
  IGameStateMsg,
} from '../proto/index.js';
import type { RoomModel } from './model.js';

/**
 * Number of copies of any tile kind in a standard set (four of each).
 */
const MAX_TILE_COPIES = 4;

/**
 * Mask that strips the akadora (red-five) bit so a red 5 counts as an ordinary 5
 * when comparing tile kinds. Mirrors the server's `Tile.NoDoraVal` (`& 0x7f`).
 */
const TILE_KIND_MASK = 0x7f;

/**
 * A hand's tiles that are visible to (and counted by) the local player: the
 * concealed free tiles, the just-drawn pending tile, called melds, and the
 * discard river.
 */
export interface VisibleHand {
  freeTiles?: IGameTileMsg[] | null | undefined;
  pendingTile?: IGameTileMsg | null | undefined;
  called?: IMenLikeMsg[] | null | undefined;
  discarded?: IGameTileMsg[] | null | undefined;
}

function tileKind(tile: IGameTileMsg | null | undefined): number | null {
  const byte = tile?.tile;
  if (byte == null || byte <= 0) return null;
  return byte & TILE_KIND_MASK;
}

function pushKind(out: number[], tile: IGameTileMsg | null | undefined): void {
  const kind = tileKind(tile);
  if (kind != null) out.push(kind);
}

/**
 * Collects the kinds (akadora-normalized) of every tile the local player can
 * see and that the wait-count calculation subtracts from four:
 *   - every player's called melds and discard rivers (public), and
 *   - the local player's own free + pending tiles (private), and
 *   - the revealed dora indicators.
 *
 * Opponents' concealed tiles carry no face (`tile <= 0`) and are skipped, which
 * matches the server counting only what the receiving player can see.
 */
export function collectVisibleTileKinds(
  hands: readonly VisibleHand[],
  revealedDoras: readonly IGameTileMsg[],
): number[] {
  const kinds: number[] = [];
  for (const hand of hands) {
    for (const tile of hand.freeTiles ?? []) pushKind(kinds, tile);
    pushKind(kinds, hand.pendingTile);
    for (const meld of hand.called ?? []) {
      for (const tile of meld.tiles ?? []) pushKind(kinds, tile);
    }
    for (const tile of hand.discarded ?? []) pushKind(kinds, tile);
  }
  for (const dora of revealedDoras) pushKind(kinds, dora);
  return kinds;
}

/**
 * How many copies of a winning tile are still unseen by the local player.
 *
 * Replaces the previously server-computed `TenpaiInfoMsg.remaining_count`: the
 * client has full visibility of everything the server counted, so it derives the
 * value itself. Equals `max(0, 4 - copies of that kind the player can see)`.
 */
export function countRemainingWinningTile(
  winningTileByte: number,
  visibleKinds: readonly number[],
): number {
  const target = winningTileByte & TILE_KIND_MASK;
  let seen = 0;
  for (const kind of visibleKinds) {
    if (kind === target) seen++;
  }
  return Math.max(0, MAX_TILE_COPIES - seen);
}

/**
 * Visible tile kinds derived from a full game-state snapshot (used on the
 * reconnection/sync path). Includes all players' melds/discards, the local
 * player's own concealed tiles (opponents' are face-down and skipped), and the
 * revealed dora indicators.
 */
export function collectVisibleTileKindsFromSnapshot(
  snapshot: IGameStateMsg,
): number[] {
  const hands: VisibleHand[] = (snapshot.players ?? []).map((p) => ({
    freeTiles: p.hand?.freeTiles,
    pendingTile: p.hand?.pendingTile,
    called: p.hand?.called,
    discarded: p.hand?.discarded,
  }));
  const revealedDoras = snapshot.wall?.doras ?? [];
  return collectVisibleTileKinds(hands, revealedDoras);
}

/**
 * Visible tile kinds derived from the live room model (used on the inquiry path,
 * when the client must compute wait counts for the local player's discard
 * candidates). Mirrors {@link collectVisibleTileKindsFromSnapshot}.
 */
export function collectVisibleTileKindsFromRoom(room: RoomModel): number[] {
  const hands: VisibleHand[] = room.players
    .map((p) => p.gameState?.hand)
    .filter((hand): hand is NonNullable<typeof hand> => hand != null);
  const info = room.info;
  const revealedDoras = info ? info.doras.slice(0, info.revealedDoraCount) : [];
  return collectVisibleTileKinds(hands, revealedDoras);
}
