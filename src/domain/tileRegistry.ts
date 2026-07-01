import type { IEventMsg, IGameStateMsg, IGameTileMsg } from '../proto/index.js';

/**
 * A registry of every tile the server has mentioned, keyed by `traceId`.
 *
 * The server identifies a physical tile by a stable `traceId` and re-sends the
 * tile's full record (`tile`, `source`, `discardInfo`, ...) every time it is
 * mentioned (draw, discard, claim, kan, snapshot, ...). The registry keeps the
 * latest record per `traceId` so the client can look up information about a tile
 * even after it has left the structure it was last seen in.
 *
 * The motivating case: a riichi declaration tile that is later called away is
 * removed from the discarder's river, yet we still need its discard timestamp to
 * decide which surviving discard should now be drawn sideways. The registry
 * retains that record.
 *
 * Mirrors the per-`traceId` tile cache in the Cocos client (TableComponent).
 */
export type TileRegistry = ReadonlyMap<number, IGameTileMsg>;

export function createEmptyTileRegistry(): TileRegistry {
  return new Map<number, IGameTileMsg>();
}

/**
 * Returns a new registry with the given tiles merged in.
 *
 * The latest record wins per field, but information already known is never lost:
 * if an incoming record omits `discardInfo` (e.g. a claim event re-sends a tile
 * with its source changed to PON but drops the original discard timestamp) the
 * previously recorded `discardInfo` is preserved. This keeps the discard
 * timestamp available for riichi sideways-tile resolution even after a call.
 *
 * Tiles with a non-positive `traceId` are unknown/face-down placeholders and are
 * intentionally not registered. The input registry is never mutated; a new Map
 * is returned only when something actually changes, so reducers can keep their
 * value-equality semantics for unchanged state.
 */
export function mergeTilesIntoRegistry(
  registry: TileRegistry,
  tiles: readonly (IGameTileMsg | null | undefined)[],
): TileRegistry {
  let next: Map<number, IGameTileMsg> | null = null;
  for (const tile of tiles) {
    const traceId = tile?.traceId;
    if (tile == null || traceId == null || traceId <= 0) {
      continue;
    }
    next ??= new Map(registry);
    const existing = next.get(traceId);
    next.set(traceId, mergeTileRecords(existing, tile));
  }
  return next ?? registry;
}

/** Combines two records for the same tile, preserving known discard info. */
function mergeTileRecords(
  existing: IGameTileMsg | undefined,
  incoming: IGameTileMsg,
): IGameTileMsg {
  if (!existing) {
    return incoming;
  }
  const merged: IGameTileMsg = { ...existing, ...incoming };
  if (incoming.discardInfo == null && existing.discardInfo != null) {
    merged.discardInfo = existing.discardInfo;
  }
  return merged;
}

/** Looks up the latest known record for a tile, or `undefined` if unseen. */
export function getRegisteredTile(
  registry: TileRegistry,
  traceId: number | null | undefined,
): IGameTileMsg | undefined {
  if (traceId == null || traceId <= 0) {
    return undefined;
  }
  return registry.get(traceId);
}

/** Pulls every `GameTileMsg` referenced by a single game event. */
export function extractEventTiles(eventMsg: IEventMsg): IGameTileMsg[] {
  const tiles: IGameTileMsg[] = [];
  const push = (...t: (IGameTileMsg | null | undefined)[]): void => {
    for (const tile of t) {
      if (tile) tiles.push(tile);
    }
  };

  push(...(eventMsg.dealHandEvent?.tiles ?? []));
  push(eventMsg.drawTileEvent?.tile);
  push(eventMsg.dealerFirstTurnEvent?.incoming);
  push(eventMsg.discardTileEvent?.discarded);
  push(
    eventMsg.claimTileEvent?.tile,
    ...(eventMsg.claimTileEvent?.group?.tiles ?? []),
  );
  push(eventMsg.kanEvent?.incoming, ...(eventMsg.kanEvent?.kan?.tiles ?? []));
  push(eventMsg.revealDoraEvent?.dora);
  push(eventMsg.setRiichiEvent?.riichiTile);
  push(eventMsg.agariEvent?.incoming);
  for (const agari of eventMsg.agariEvent?.agariInfos ?? []) {
    push(...(agari.freeTiles ?? []));
  }
  push(...(eventMsg.concludeGameEvent?.doras ?? []));
  push(...(eventMsg.concludeGameEvent?.uradoras ?? []));

  return tiles;
}

/** Pulls every `GameTileMsg` contained in a full game-state snapshot. */
export function extractSnapshotTiles(snapshot: IGameStateMsg): IGameTileMsg[] {
  const tiles: IGameTileMsg[] = [];
  const push = (...t: (IGameTileMsg | null | undefined)[]): void => {
    for (const tile of t) {
      if (tile) tiles.push(tile);
    }
  };

  push(...(snapshot.wall?.doras ?? []));
  for (const player of snapshot.players ?? []) {
    const hand = player.hand;
    if (!hand) continue;
    push(...(hand.freeTiles ?? []));
    push(...(hand.discarded ?? []));
    push(hand.pendingTile, hand.riichiTile, hand.agariTile);
    for (const meld of hand.called ?? []) {
      push(...(meld.tiles ?? []));
    }
  }

  return tiles;
}
