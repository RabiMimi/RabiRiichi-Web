import type { IGameTileMsg, IWildcardAssignmentMsg } from '../proto/index.js';
import { Tile } from './tile.js';

/** Physical wildcard trace id -> the natural tile byte it stood for. */
export type WildcardAssignments = ReadonlyMap<number, number>;

/** A tile as a winning hand is read: its effective face, flagged if wild. */
export interface ResolvedTile {
  traceId: number | null;
  /** Effective tile byte: the assigned natural tile for a wildcard. */
  tile: number;
  fromWildcard: boolean;
}

export function toWildcardAssignments(
  msgs: readonly IWildcardAssignmentMsg[] | null | undefined,
): WildcardAssignments {
  const assignments = new Map<number, number>();
  for (const msg of msgs ?? []) {
    if (msg.traceId && msg.tile) assignments.set(msg.traceId, msg.tile);
  }
  return assignments;
}

export function resolveTile(
  tile: IGameTileMsg,
  assignments: WildcardAssignments | undefined,
): ResolvedTile {
  const traceId = tile.traceId ?? null;
  const assigned = traceId == null ? undefined : assignments?.get(traceId);
  return assigned === undefined
    ? { traceId, tile: tile.tile ?? 0, fromWildcard: false }
    : { traceId, tile: assigned, fromWildcard: true };
}

/**
 * Reads a winning hand through the server's wildcard interpretation and sorts
 * it by effective tile, so the groups the score came from line up. A natural
 * tile sorts before a wildcard standing for the same tile.
 */
export function resolveHandTiles(
  tiles: readonly IGameTileMsg[],
  assignments: WildcardAssignments | undefined,
): ResolvedTile[] {
  return tiles
    .map((tile) => resolveTile(tile, assignments))
    .sort(
      (a, b) =>
        Tile.fromByte(a.tile).compareTo(Tile.fromByte(b.tile)) ||
        Number(a.fromWildcard) - Number(b.fromWildcard),
    );
}
