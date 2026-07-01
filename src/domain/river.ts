import type { IGameTileMsg } from '../proto/index.js';
import { getRegisteredTile, type TileRegistry } from './tileRegistry.js';

/**
 * Resolves which discard in a player's river should be drawn sideways to mark a
 * riichi declaration.
 *
 * In riichi mahjong exactly one tile in the river is rotated: the tile the
 * player discarded when declaring riichi. But if that tile is later called
 * (chii/pon/kan) it leaves the river, and the rule is that the player's *next*
 * surviving discard becomes the sideways one (and so on). So the sideways tile
 * is "the first surviving discard at or after the declaration".
 *
 * The server only tells us the original declaration tile (`riichiTileId`). We
 * order discards by `discardInfo.time`, a strictly increasing per-discard
 * timestamp, and look for the first river tile whose time is not before the
 * declaration's. The declaration tile may itself be gone from the river (it was
 * called), so its timestamp is read from the tile registry, which retains every
 * tile the server has mentioned.
 *
 * Invariants (verified against the engine) that make this correct and let us
 * binary-search:
 * - A river is append-only on both server and client, and the only client-side
 *   removal (a called tile) is order-preserving, so the river is always sorted
 *   ascending by `discardInfo.time`.
 * - `discardInfo.time` comes from an atomic counter, so every river tile has a
 *   distinct, non-null time. The lower-bound match is therefore unique, and when
 *   the declaration tile is still present it lands exactly on that tile.
 *
 * @returns the `traceId` of the river tile to draw sideways, or 0 if none.
 */
export function getRiichiSidewaysTraceId(
  discarded: readonly IGameTileMsg[],
  riichiTileId: number,
  registry: TileRegistry,
): number {
  if (riichiTileId <= 0 || discarded.length === 0) {
    return 0;
  }

  const riichiTime = getRegisteredTile(registry, riichiTileId)?.discardInfo
    ?.time;
  if (riichiTime == null) {
    // Without the declaration timestamp we cannot locate the successor, so
    // render no sideways tile rather than guessing the wrong one.
    return 0;
  }

  const tile = firstDiscardAtOrAfter(discarded, riichiTime);
  return tile?.traceId ?? 0;
}

/**
 * Lower-bound search: the first river tile with `discardInfo.time >= time`.
 *
 * Relies on the river being sorted ascending by `discardInfo.time` (see the
 * invariants documented on `getRiichiSidewaysTraceId`).
 */
function firstDiscardAtOrAfter(
  discarded: readonly IGameTileMsg[],
  time: number,
): IGameTileMsg | null {
  let lo = 0;
  let hi = discarded.length; // exclusive; result is in [lo, hi]
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const midTime =
      discarded[mid]?.discardInfo?.time ?? Number.POSITIVE_INFINITY;
    if (midTime < time) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo < discarded.length ? (discarded[lo] ?? null) : null;
}
