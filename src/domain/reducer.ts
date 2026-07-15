import {
  UserStatus,
  FuritenType,
  TileSource,
  AiType,
  ScoringType,
} from '../proto/index.js';
import type {
  IGameStateMsg,
  IEventMsg,
  IBeginGameEventMsg,
  IDealHandEventMsg,
  IDrawTileEventMsg,
  IDiscardTileEventMsg,
  IClaimTileEventMsg,
  IKanEventMsg,
  IAddNukiDoraEventMsg,
  INextPlayerEventMsg,
  IIncreaseJunEventMsg,
  IRevealDoraEventMsg,
  ISetRiichiEventMsg,
  ISetFuritenEventMsg,
  IDealerFirstTurnEventMsg,
  IAddTileEventMsg,
  IGameTileMsg,
  IAgariEventMsg,
  IApplyScoreEventMsg,
  IRyuukyokuEventMsg,
  IConcludeGameEventMsg,
  INextGameEventMsg,
  IStopGameEventMsg,
  ISyncGameStateEventMsg,
  IServerRoomStateMsg,
} from '../proto/index.js';
import type {
  RoomModel,
  PlayerModel,
  GameInfo,
  PlayerGameState,
  PlayerHandState,
  PlayerAgariState,
  MappedTenpaiInfo,
} from './model.js';
import { isTsumoTile } from './model.js';
import { Tile, isTileUnknown } from './tile.js';
import {
  createEmptyTileRegistry,
  extractEventTiles,
  extractSnapshotTiles,
  getRegisteredTile,
  mergeTilesIntoRegistry,
  type TileRegistry,
} from './tileRegistry.js';
import {
  buildTileSetCounts,
  collectVisibleTileKinds,
  collectVisibleTileKindsFromRoom,
  collectVisibleTileKindsFromSnapshot,
  countRemainingWinningTile,
} from './tenpai.js';

/**
 * Restores a tile's face value from the registry when the incoming record hides
 * it (`tile` is 0/undefined). The server hides opponents' concealed tiles in
 * reconnection snapshots, which would otherwise turn an already-revealed winning
 * hand into face-down "?" tiles. The registry retains the last known face, so we
 * recover it here. Returns the original tile when nothing better is known.
 */
function resolveTileFace(
  registry: TileRegistry,
  tile: IGameTileMsg,
): IGameTileMsg {
  if (!isTileUnknown(tile.tile)) return tile;
  const known = getRegisteredTile(registry, tile.traceId);
  return known && typeof known.tile === 'number' && known.tile > 0
    ? { ...tile, tile: known.tile }
    : tile;
}

export function hydrateFromGameState(
  state: RoomModel,
  snapshot: IGameStateMsg,
): RoomModel {
  // 1. Build GameInfo
  const info: GameInfo | null = snapshot.info
    ? {
        round: snapshot.info.round ?? 0,
        dealer: snapshot.info.dealer ?? 0,
        honba: snapshot.info.honba ?? 0,
        riichiStick: snapshot.info.riichiStick ?? 0,
        remainingTiles: snapshot.wall?.remaining ?? 0,
        currentPlayer: snapshot.info.currentPlayer ?? 0,
        doras: snapshot.wall?.doras ?? [],
        uradoras: [],
      }
    : null;

  // A snapshot is the authoritative full state. Merge its tiles into the
  // existing registry (rather than starting empty) so faces revealed earlier in
  // the round - e.g. a winner's hand from an AgariEvent - survive a reconnection
  // snapshot that re-sends opponents' tiles face-down.
  const tileRegistry = mergeTilesIntoRegistry(
    state.tileRegistry,
    extractSnapshotTiles(snapshot),
  );

  // 2. Build Players
  let players = state.players;

  if (players.length === 0 && snapshot.players) {
    players = snapshot.players.map((sp) => ({
      id: sp.id ?? 0,
      nickname: `Player ${sp.id}`,
      status: UserStatus.USER_STATUS_PLAYING,
      seat: sp.id ?? 0,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    }));
  }

  // The winning-tile "remaining" count is derived client-side (the server no
  // longer sends it). Gather the visible tile kinds and the per-kind maximums of
  // the configured tile set once.
  const visibleKinds = collectVisibleTileKindsFromSnapshot(snapshot);
  const tileSetCounts = buildTileSetCounts(snapshot.config);

  const updatedPlayers = players.map((p): PlayerModel => {
    if (p.seat === undefined) {
      return p;
    }
    const sp = snapshot.players?.find((s) => s.id === p.seat);
    if (!sp) {
      return p;
    }

    const handState = sp.hand;
    const handWaits = (handState?.tenpaiWaits ?? []).map((ti) => {
      const winningTile = ti.winningTile ?? 0;
      return {
        winningTile,
        remainingCount: countRemainingWinningTile(
          winningTile,
          visibleKinds,
          tileSetCounts,
        ),
        han: ti.han ?? 0,
        yakuHan: ti.yakuHan ?? 0,
        fu: ti.fu ?? 0,
        yakuman: ti.yakuman ?? 0,
        points: ti.points ? Number(ti.points) : 0,
      };
    });

    const gameState: PlayerGameState = {
      jun: handState?.jun ?? 0,
      points: sp.points ? Number(sp.points) : 0,
      riichiTileId: handState?.riichiTile?.traceId ?? 0,
      furiten: {
        [FuritenType.FURITEN_TYPE_DISCARD]:
          handState?.isDiscardFuriten ?? false,
        [FuritenType.FURITEN_TYPE_RIICHI]: handState?.isRiichiFuriten ?? false,
        [FuritenType.FURITEN_TYPE_TEMP]: handState?.isTempFuriten ?? false,
      },
      hand: {
        freeTiles: (handState?.freeTiles ?? []).map((t) =>
          resolveTileFace(tileRegistry, t),
        ),
        called: handState?.called ?? [],
        discarded: (handState?.discarded ?? [])
          .filter(
            (t) =>
              t.formTime === undefined || t.formTime === null || t.formTime < 0,
          )
          .map((t) => resolveTileFace(tileRegistry, t)),
        pendingTile: handState?.pendingTile ?? null,
        nukiDora: handState?.nukiDora ?? [],
      },
      agari: p.gameState?.agari ?? null,
      ...(handWaits.length > 0
        ? { awaitedTiles: handWaits }
        : p.gameState?.awaitedTiles
          ? { awaitedTiles: p.gameState.awaitedTiles }
          : {}),
    };

    return {
      ...p,
      status: UserStatus.USER_STATUS_PLAYING,
      gameState,
    };
  });

  return {
    ...state,
    config: snapshot.config ?? null,
    info,
    players: updatedPlayers,
    tileRegistry,
    gameId: snapshot.info?.gameId ?? state.gameId ?? null,
  };
}

// Helper to sort game tiles using domain Tile logic
function sortGameTiles(tiles: IGameTileMsg[]): IGameTileMsg[] {
  return [...tiles].sort((a, b) => {
    if (a.tile == null || b.tile == null) return 0;
    const tileA = Tile.fromByte(a.tile);
    const tileB = Tile.fromByte(b.tile);
    return tileA.compareTo(tileB);
  });
}

// Folds a still-pending drawn tile into the sorted free tiles. This mirrors the
// server's `Hand.AddPending`, which we defer visually (see handleAddTile). Call
// this whenever a pending tile survives a turn (e.g. an ankan/nuki on other
// tiles triggers a rinshan draw) so the drawn tile is not silently dropped when
// the next pendingTile arrives.
function mergePendingIntoFree(hand: PlayerHandState): PlayerHandState {
  if (!hand.pendingTile) return hand;
  return {
    ...hand,
    freeTiles: sortGameTiles([...hand.freeTiles, hand.pendingTile]),
    pendingTile: null,
  };
}

function handleBeginGame(state: RoomModel, ev: IBeginGameEventMsg): RoomModel {
  const eventGameId = ev.gameId === '' ? null : ev.gameId;
  const info: GameInfo = {
    round: ev.round ?? 0,
    dealer: ev.dealer ?? 0,
    honba: ev.honba ?? 0,
    riichiStick: ev.riichiStick ?? 0,
    remainingTiles: ev.remainingTiles ?? 0,
    currentPlayer: ev.dealer ?? 0,
    doras: [],
    uradoras: [],
  };
  if (ev.initialWall) {
    info.initialWall = ev.initialWall;
  }

  const initialPoints = state.config?.pointThreshold?.initialPoints
    ? Number(state.config.pointThreshold.initialPoints)
    : 25000;

  // beginGameEvent starts a new round of the CURRENT game (points accumulate
  // across rounds) unless the previous game already ended, in which case this
  // begins a brand-new game in the same room and points must reset.
  const isNewGame = state.info === null || (state.gameEnded ?? false);

  const updatedPlayers = state.players.map((p): PlayerModel => {
    const initialGameState: PlayerGameState = {
      jun: 0,
      points: isNewGame
        ? initialPoints
        : (p.gameState?.points ?? initialPoints),
      riichiTileId: 0,
      furiten: {
        [FuritenType.FURITEN_TYPE_DISCARD]: false,
        [FuritenType.FURITEN_TYPE_RIICHI]: false,
        [FuritenType.FURITEN_TYPE_TEMP]: false,
      },
      hand: {
        freeTiles: [],
        called: [],
        discarded: [],
        pendingTile: null,
        nukiDora: [],
      },
      agari: null,
    };
    return {
      ...p,
      status: UserStatus.USER_STATUS_PLAYING,
      gameState: initialGameState,
    };
  });

  return {
    ...state,
    info,
    players: updatedPlayers,
    ryuukyokuReason: null,
    // Clear the previous game's end state once a new game begins.
    gameEnded: false,
    endGamePoints: null,
    concludedPlayers: null,
    // The previous round's frozen result is no longer relevant.
    roundResultPlayers: null,
    gameId: eventGameId ?? state.gameId ?? null,
  };
}

function handleDealHand(state: RoomModel, ev: IDealHandEventMsg): RoomModel {
  if (!state.info) return state;

  const info = {
    ...state.info,
    remainingTiles: state.info.remainingTiles - (ev.count ?? 0),
  };

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== ev.playerId || !p.gameState) return p;
    const freeTiles = [...p.gameState.hand.freeTiles, ...(ev.tiles ?? [])];
    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...p.gameState.hand,
          freeTiles: sortGameTiles(freeTiles),
        },
      },
    };
  });

  return {
    ...state,
    info,
    players: updatedPlayers,
  };
}

function handleDrawTile(state: RoomModel, ev: IDrawTileEventMsg): RoomModel {
  if (!state.info || !ev.tile) return state;

  let remainingTiles = state.info.remainingTiles;
  if (
    ev.source === TileSource.TILE_SOURCE_WALL ||
    ev.source === TileSource.TILE_SOURCE_WANPAI
  ) {
    remainingTiles--;
  }

  const info = {
    ...state.info,
    remainingTiles,
  };

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== ev.playerId || !p.gameState) return p;
    // A leftover pendingTile means the previous draw survived the turn (e.g. an
    // ankan/nuki on other tiles). Fold it into freeTiles before this new draw
    // overwrites the slot, otherwise the earlier drawn tile is lost.
    const hand = mergePendingIntoFree(p.gameState.hand);
    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...hand,
          pendingTile: ev.tile ?? null,
        },
      },
    };
  });

  return {
    ...state,
    info,
    players: updatedPlayers,
  };
}

function handleAddTile(state: RoomModel, _ev: IAddTileEventMsg): RoomModel {
  // Visual deferral: Do not merge the pending drawn tile into freeTiles
  // immediately. The merge happens once the tile's fate is known: in
  // handleDiscardTile (discard), handleKan/handleNukiDora (consumed by the
  // meld/nuki), handleDrawTile (a follow-up rinshan draw for the same turn), or
  // handleRyuukyoku (round exhausts). This keeps the drawn tile at the "just
  // drawn" position until its outcome is resolved.
  return state;
}

function handleDiscardTile(
  state: RoomModel,
  ev: IDiscardTileEventMsg,
): RoomModel {
  if (!state.info || !ev.discarded) return state;
  const discardedTile = ev.discarded;

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== ev.playerId || !p.gameState) return p;

    const traceId = discardedTile.traceId;
    let freeTiles = p.gameState.hand.freeTiles;
    let pendingTile = p.gameState.hand.pendingTile;

    if (pendingTile && pendingTile.traceId === traceId) {
      pendingTile = null;
    } else {
      freeTiles = freeTiles.filter((t) => t.traceId !== traceId);
      // Safety merge if pending tile was not sorted yet
      if (pendingTile) {
        freeTiles = sortGameTiles([...freeTiles, pendingTile]);
        pendingTile = null;
      }
    }

    const discarded = [...p.gameState.hand.discarded, discardedTile];
    const riichiTileId =
      (ev.isRiichi ? discardedTile.traceId : p.gameState.riichiTileId) ?? 0;

    return {
      ...p,
      gameState: {
        ...p.gameState,
        riichiTileId,
        hand: {
          ...p.gameState.hand,
          freeTiles,
          pendingTile,
          discarded,
        },
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}

function handleClaimTile(state: RoomModel, ev: IClaimTileEventMsg): RoomModel {
  if (!ev.tile || !ev.group) return state;
  const claimedTile = ev.tile;
  const group = ev.group;
  const playerId = ev.playerId;
  const prevPlayerId = claimedTile.discardInfo?.from;

  const updatedPlayers = state.players.map((p): PlayerModel => {
    // 1. Remove tile from discarder's river
    if (
      prevPlayerId !== undefined &&
      p.seat === prevPlayerId &&
      playerId !== prevPlayerId
    ) {
      if (p.gameState) {
        const discarded = p.gameState.hand.discarded.filter(
          (t) => t.traceId !== claimedTile.traceId,
        );
        return {
          ...p,
          gameState: {
            ...p.gameState,
            hand: {
              ...p.gameState.hand,
              discarded,
            },
          },
        };
      }
    }

    // 2. Add called group to claimer's hand and remove claimed tiles from freeTiles
    if (p.seat === playerId) {
      if (p.gameState) {
        const groupTiles = group.tiles ?? [];
        const traceIdsToRemove = groupTiles
          .filter((t) => t.traceId !== claimedTile.traceId)
          .map((t) => t.traceId);

        const freeTiles = p.gameState.hand.freeTiles.filter(
          (t) => !traceIdsToRemove.includes(t.traceId),
        );

        const called = [...p.gameState.hand.called, group];

        return {
          ...p,
          gameState: {
            ...p.gameState,
            hand: {
              ...p.gameState.hand,
              freeTiles: sortGameTiles(freeTiles),
              called,
            },
          },
        };
      }
    }

    return p;
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}

function handleKan(state: RoomModel, ev: IKanEventMsg): RoomModel {
  if (!ev.incoming || !ev.kan) return state;
  const incoming = ev.incoming;
  const kan = ev.kan;
  const playerId = ev.playerId;

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== playerId || !p.gameState) return p;

    let freeTiles = p.gameState.hand.freeTiles;
    let pendingTile = p.gameState.hand.pendingTile;
    let called = p.gameState.hand.called;

    if (ev.kanSource === TileSource.TILE_SOURCE_KAKAN) {
      // Added Kan (Kakan)
      if (pendingTile && pendingTile.traceId === incoming.traceId) {
        pendingTile = null;
      } else {
        freeTiles = freeTiles.filter((t) => t.traceId !== incoming.traceId);
      }

      const incomingTile = Tile.fromByte(incoming.tile ?? 0);
      const updatedKan = { ...kan };
      if (kan.tiles) {
        // The live KanEvent fires before the server upgrades the pon, so the
        // added tile still carries formTime -1 while the 3 original pon tiles
        // keep their (larger) pon-era formTime. The renderer stacks the tile
        // with the max formTime, so force the added tile above the others to
        // match the post-refresh snapshot and avoid rendering a 5th tile.
        const maxFormTime = kan.tiles.reduce(
          (max, t) => Math.max(max, t.formTime ?? 0),
          0,
        );
        updatedKan.tiles = kan.tiles.map((t) => ({
          ...t,
          source: TileSource.TILE_SOURCE_KAKAN,
          formTime:
            t.traceId === incoming.traceId
              ? maxFormTime + 1
              : (t.formTime ?? null),
        }));
      }

      called = called.map((m) => {
        const isMatchingPon = m.tiles?.every((t) => {
          const tileObj = Tile.fromByte(t.tile ?? 0);
          return (
            tileObj.suit === incomingTile.suit &&
            tileObj.num === incomingTile.num
          );
        });
        if (isMatchingPon) {
          return updatedKan;
        }
        return m;
      });
    } else if (ev.kanSource === TileSource.TILE_SOURCE_ANKAN) {
      // Closed Kan (Ankan)
      const traceIdsToRemove = kan.tiles?.map((t) => t.traceId) ?? [];

      if (pendingTile && traceIdsToRemove.includes(pendingTile.traceId)) {
        pendingTile = null;
      }
      freeTiles = freeTiles.filter(
        (t) => !traceIdsToRemove.includes(t.traceId),
      );
      called = [...called, kan];
    }

    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...p.gameState.hand,
          freeTiles: sortGameTiles(freeTiles),
          pendingTile,
          called,
        },
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}

function handleNukiDora(state: RoomModel, ev: IAddNukiDoraEventMsg): RoomModel {
  if (!ev.incoming) return state;
  const incoming = ev.incoming;
  const playerId = ev.playerId;

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== playerId || !p.gameState) return p;

    let pendingTile = p.gameState.hand.pendingTile;
    let freeTiles = p.gameState.hand.freeTiles;
    if (pendingTile && pendingTile.traceId === incoming.traceId) {
      pendingTile = null;
    } else {
      freeTiles = freeTiles.filter((t) => t.traceId !== incoming.traceId);
    }

    const nukiTile = { ...incoming, source: TileSource.TILE_SOURCE_NUKI };
    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...p.gameState.hand,
          freeTiles: sortGameTiles(freeTiles),
          pendingTile,
          nukiDora: [...p.gameState.hand.nukiDora, nukiTile],
        },
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}

function handleNextPlayer(
  state: RoomModel,
  ev: INextPlayerEventMsg,
): RoomModel {
  if (!state.info) return state;
  return {
    ...state,
    info: {
      ...state.info,
      currentPlayer: ev.nextPlayerId ?? 0,
    },
  };
}

function handleIncreaseJun(
  state: RoomModel,
  ev: IIncreaseJunEventMsg,
): RoomModel {
  if (!state.info) return state;

  const info = {
    ...state.info,
    currentPlayer: ev.playerId ?? 0,
  };

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== ev.playerId || !p.gameState) return p;
    return {
      ...p,
      gameState: {
        ...p.gameState,
        jun: ev.increasedJun ?? 0,
      },
    };
  });

  return {
    ...state,
    info,
    players: updatedPlayers,
  };
}

function handleRevealDora(
  state: RoomModel,
  ev: IRevealDoraEventMsg,
): RoomModel {
  if (!state.info || !ev.dora) return state;
  return {
    ...state,
    info: {
      ...state.info,
      doras: [...state.info.doras, ev.dora],
    },
  };
}

function handleSetRiichi(state: RoomModel, ev: ISetRiichiEventMsg): RoomModel {
  // A set-riichi event is a riichi declaration: deduct the riichi stick from
  // the declaring player and add it to the table pot.
  const riichiPoints = state.config?.pointThreshold?.riichiPoints
    ? Number(state.config.pointThreshold.riichiPoints)
    : 1000;

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== ev.playerId || !p.gameState) return p;
    return {
      ...p,
      gameState: {
        ...p.gameState,
        riichiTileId: ev.riichiTile?.traceId ?? 0,
        points: p.gameState.points - riichiPoints,
      },
    };
  });

  const info = state.info
    ? { ...state.info, riichiStick: state.info.riichiStick + 1 }
    : state.info;

  return {
    ...state,
    info,
    players: updatedPlayers,
  };
}

function handleSetFuriten(
  state: RoomModel,
  ev: ISetFuritenEventMsg,
): RoomModel {
  if (ev.furitenType == null) return state;
  const furitenType = ev.furitenType;
  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== ev.playerId || !p.gameState) return p;
    const furiten = { ...p.gameState.furiten };
    furiten[furitenType] = ev.furiten ?? false;
    return {
      ...p,
      gameState: {
        ...p.gameState,
        furiten,
      },
    };
  });
  return {
    ...state,
    players: updatedPlayers,
  };
}

function handleDealerFirstTurn(
  state: RoomModel,
  ev: IDealerFirstTurnEventMsg,
): RoomModel {
  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== ev.playerId || !p.gameState) return p;

    let freeTiles = p.gameState.hand.freeTiles;
    if (ev.incoming) {
      freeTiles = freeTiles.filter((t) => t.traceId !== ev.incoming?.traceId);
    }

    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...p.gameState.hand,
          freeTiles: sortGameTiles(freeTiles),
          pendingTile: ev.incoming ?? null,
        },
      },
    };
  });
  return {
    ...state,
    players: updatedPlayers,
  };
}

function handleAgari(state: RoomModel, ev: IAgariEventMsg): RoomModel {
  const incoming = ev.incoming;
  // Authoritative win type from the server. Fall back to the tile-based check
  // only for older logs that predate the is_tsumo flag.
  const isTsumo = ev.isTsumo ?? isTsumoTile(incoming);

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (!p.gameState) return p;

    const agariInfo = ev.agariInfos?.find((info) => info.playerId === p.seat);
    if (!agariInfo) return p;

    const rawFreeTiles =
      agariInfo.freeTiles && agariInfo.freeTiles.length > 0
        ? agariInfo.freeTiles
        : p.gameState.hand.freeTiles;
    // Resolve any hidden faces so a later reconnection snapshot cannot turn the
    // revealed winning hand into "?" tiles (see resolveTileFace).
    const freeTiles = rawFreeTiles.map((t) =>
      resolveTileFace(state.tileRegistry, t),
    );

    let finalFreeTiles = freeTiles;
    let finalPendingTile: IGameTileMsg | null = null;

    // For a tsumo, lift the self-drawn winning tile out of the hand and show it
    // as the pending tile so the win animation can highlight it separately.
    if (incoming && isTsumo) {
      finalPendingTile = incoming;
      finalFreeTiles = freeTiles.filter((t) => t.traceId !== incoming.traceId);
    }

    const agariState: PlayerAgariState = {
      scores: agariInfo.scores ?? null,
      incoming: incoming ?? null,
      isTsumo,
      gainPoints: p.gameState.agari?.gainPoints ?? 0,
      losePoints: p.gameState.agari?.losePoints ?? 0,
    };

    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...p.gameState.hand,
          freeTiles: sortGameTiles(finalFreeTiles),
          pendingTile: finalPendingTile,
        },
        agari: agariState,
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}

function handleApplyScore(
  state: RoomModel,
  ev: IApplyScoreEventMsg,
): RoomModel {
  const playerCount = state.config?.playerCount ?? 2;
  const scoreChanges = ev.scoreChange ?? [];

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (!p.gameState || p.seat === undefined) return p;

    let points = p.gameState.points;
    let gainPoints = p.gameState.agari?.gainPoints ?? 0;
    let losePoints = p.gameState.agari?.losePoints ?? 0;

    for (const transfer of scoreChanges) {
      if (
        transfer.from === p.seat &&
        transfer.from >= 0 &&
        transfer.from < playerCount
      ) {
        const transferPoints = Number(transfer.points);
        points -= transferPoints;
        losePoints += transferPoints;
      }
      if (
        transfer.to === p.seat &&
        transfer.to >= 0 &&
        transfer.to < playerCount
      ) {
        const transferPoints = Number(transfer.points);
        points += transferPoints;
        gainPoints += transferPoints;
      }
    }

    let agari = p.gameState.agari;
    const hasTransfer = scoreChanges.some(
      (t) => t.from === p.seat || t.to === p.seat,
    );
    if (hasTransfer && !agari) {
      agari = {
        gainPoints,
        losePoints,
      };
    } else if (agari) {
      agari = {
        ...agari,
        gainPoints,
        losePoints,
      };
    }

    return {
      ...p,
      gameState: {
        ...p.gameState,
        points,
        agari,
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    // Freeze the settled result so the round-result panel stays static even if
    // a player leaves the room while it is displayed.
    roundResultPlayers: updatedPlayers.map((p) => ({ ...p })),
  };
}

function handleConcludeGame(
  state: RoomModel,
  ev: IConcludeGameEventMsg,
): RoomModel {
  if (!state.info) return state;
  return {
    ...state,
    info: {
      ...state.info,
      doras: ev.doras ?? [],
      uradoras: ev.uradoras ?? [],
    },
  };
}

function handleNextGame(state: RoomModel, ev: INextGameEventMsg): RoomModel {
  if (!state.info) return state;
  // The server's order is concludeGame -> nextGame -> next_round ack inquiry
  // -> beginGame. The result panel must stay visible during the ack window, so
  // nextGame must NOT clear the per-player hand/agari result. We only advance
  // the round metadata here; the full per-hand reset happens in handleBeginGame
  // once the next hand actually starts dealing (after the ack).
  return {
    ...state,
    info: {
      ...state.info,
      round: ev.nextRound ?? 0,
      dealer: ev.nextDealer ?? 0,
      honba: ev.nextHonba ?? 0,
      riichiStick: ev.riichiStick ?? 0,
    },
  };
}

function handleStopGame(state: RoomModel, ev: IStopGameEventMsg): RoomModel {
  return {
    ...state,
    gameEnded: true,
    endGamePoints: ev.endGamePoints
      ? ev.endGamePoints.map((num) => Number(num))
      : null,
    concludedPlayers: state.players.map((p) => ({ ...p })),
  };
}

// Event variants that applyEvent recognizes (either handled or explicitly
// ignored). Used by applyEvent to warn on gaps, and by tests to assert the
// recorded game contains no silently-dropped variant.
export const KNOWN_EVENTS = new Set([
  'beginGameEvent',
  'dealHandEvent',
  'drawTileEvent',
  'addTileEvent',
  'discardTileEvent',
  'claimTileEvent',
  'kanEvent',
  'addKanEvent',
  'nukiDoraEvent',
  'addNukiDoraEvent',
  'nextPlayerEvent',
  'increaseJunEvent',
  'revealDoraEvent',
  'setRiichiEvent',
  'setFuritenEvent',
  'dealerFirstTurnEvent',
  'agariEvent',
  'applyScoreEvent',
  'concludeGameEvent',
  'nextGameEvent',
  'stopGameEvent',
  'syncGameStateEvent',
  'ryuukyokuEvent',
  'endInquiryEvent',
  // Explicitly ignored events
  'setMenzenEvent',
  'lateClaimTileEvent',
  'setIppatsuEvent',
]);

function handleRyuukyoku(state: RoomModel, _ev: IRyuukyokuEventMsg): RoomModel {
  // Group revealed tiles by player ID
  const revealedByPlayer = new Map<number, IGameTileMsg[]>();
  if (_ev.endGameRyuukyoku?.revealedTiles) {
    for (const tile of _ev.endGameRyuukyoku.revealedTiles) {
      if (tile.playerId !== undefined && tile.playerId !== null) {
        const list = revealedByPlayer.get(tile.playerId) ?? [];
        list.push(tile);
        revealedByPlayer.set(tile.playerId, list);
      }
    }
  }

  // Group tenpai waits by player ID
  const tenpaiWaitsByPlayer = new Map<number, number[]>();
  if (_ev.endGameRyuukyoku?.tenpaiPlayersWaits) {
    for (const tp of _ev.endGameRyuukyoku.tenpaiPlayersWaits) {
      if (tp.playerId !== undefined && tp.playerId !== null && tp.waits) {
        tenpaiWaitsByPlayer.set(tp.playerId, tp.waits);
      }
    }
  }

  // Visible tile kinds for deriving winning-tile remaining counts (the server no
  // longer sends them). At an exhaustive draw the revealed tenpai hands become
  // visible too, so include them alongside the public discards/melds/doras.
  const revealedHands = [...revealedByPlayer.values()].map((tiles) => ({
    freeTiles: tiles,
  }));
  const visibleKinds = [
    ...collectVisibleTileKindsFromRoom(state),
    ...collectVisibleTileKinds(revealedHands, []),
  ];
  const tileSetCounts = buildTileSetCounts(state.config);

  // Initialize agari delta state to trigger Draw result panel.
  // The actual points and delta values are updated by the subsequent applyScoreEvent.
  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (!p.gameState || p.seat === undefined) return p;

    const isNagashi =
      _ev.endGameRyuukyoku?.nagashiManganPlayers?.includes(p.seat) ?? false;
    const isTenpai =
      _ev.endGameRyuukyoku?.tenpaiPlayers?.includes(p.seat) ?? false;

    let agari = p.gameState.agari;
    // The round is over: fold any still-pending drawn tile back into the hand
    // for every player so no drawn tile is left dangling at the draw position.
    let hand = mergePendingIntoFree(p.gameState.hand);
    const existingWaits = p.gameState.awaitedTiles;
    let awaitedTiles = existingWaits;

    if (isNagashi) {
      agari = {
        gainPoints: agari?.gainPoints ?? 0,
        losePoints: agari?.losePoints ?? 0,
        isNagashi: true,
        scores: {
          items: [
            {
              Type: ScoringType.SCORING_TYPE_HAN,
              Val: 5,
              Src: 'NagashiMangan',
            },
          ],
          result: {
            han: 5,
            fu: 30,
            yakuman: 0,
          },
        },
      };
    } else if (isTenpai) {
      agari = {
        gainPoints: agari?.gainPoints ?? 0,
        losePoints: agari?.losePoints ?? 0,
        isTenpai: true,
      };
      const pRevealed = revealedByPlayer.get(p.seat);
      if (pRevealed) {
        // Authoritative revealed tenpai hand already includes the drawn tile.
        hand = {
          ...hand,
          freeTiles: sortGameTiles(pRevealed),
        };
      }
      const waits = tenpaiWaitsByPlayer.get(p.seat) ?? [];
      const newWaits: MappedTenpaiInfo[] = waits.map((w) => ({
        winningTile: w,
        remainingCount: countRemainingWinningTile(
          w,
          visibleKinds,
          tileSetCounts,
        ),
        han: 0,
        yakuHan: 0,
        fu: 0,
        yakuman: 0,
        points: 0,
      }));
      awaitedTiles =
        existingWaits && existingWaits.length > 0 ? existingWaits : newWaits;
    } else {
      agari = {
        gainPoints: agari?.gainPoints ?? 0,
        losePoints: agari?.losePoints ?? 0,
      };
    }

    return {
      ...p,
      gameState: {
        ...p.gameState,
        agari,
        hand,
        awaitedTiles:
          isTenpai && awaitedTiles && awaitedTiles.length > 0
            ? awaitedTiles
            : undefined,
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    ryuukyokuReason: _ev.midGameRyuukyoku?.name ?? 'end_game_ryuukyoku',
    // Freeze the settled result so the round-result panel stays static even if
    // a player leaves the room while it is displayed.
    roundResultPlayers: updatedPlayers.map((p) => ({ ...p })),
  };
}

function handleSyncGameState(
  state: RoomModel,
  ev: ISyncGameStateEventMsg,
): RoomModel {
  if (!ev.gameState) return state;
  return hydrateFromGameState(state, ev.gameState);
}

export function applyEvent(state: RoomModel, eventMsg: IEventMsg): RoomModel {
  const nextState = applyEventToState(state, eventMsg);
  return updateTileRegistry(nextState, eventMsg);
}

/**
 * Keeps `state.tileRegistry` in sync with the tiles referenced by an event.
 *
 * The registry is reset at round boundaries (a fresh hand reuses traceIds) and
 * otherwise enriched with every tile the event mentioned. Snapshot events are
 * skipped here because `hydrateFromGameState` already rebuilds the registry.
 */
function updateTileRegistry(state: RoomModel, eventMsg: IEventMsg): RoomModel {
  // Not stopGameEvent: the result screen still needs the registry to render
  // riichi tiles sideways (getRiichiSidewaysTraceId reads discardInfo.time).
  if (eventMsg.beginGameEvent) {
    return { ...state, tileRegistry: createEmptyTileRegistry() };
  }
  if (eventMsg.syncGameStateEvent) {
    return state;
  }
  const tileRegistry = mergeTilesIntoRegistry(
    state.tileRegistry,
    extractEventTiles(eventMsg),
  );
  return tileRegistry === state.tileRegistry
    ? state
    : { ...state, tileRegistry };
}

function applyEventToState(state: RoomModel, eventMsg: IEventMsg): RoomModel {
  // Warn on unhandled event variants to catch gaps early (F3)
  if (import.meta.env.DEV) {
    const activeKeys = Object.keys(eventMsg).filter(
      (k) =>
        !k.startsWith('$') &&
        k !== 'other' &&
        eventMsg[k as keyof IEventMsg] !== null &&
        eventMsg[k as keyof IEventMsg] !== undefined,
    );
    for (const key of activeKeys) {
      if (!KNOWN_EVENTS.has(key)) {
        console.warn(`[Reducer] Received unhandled event variant: ${key}`);
      }
    }
  }

  if (eventMsg.beginGameEvent) {
    return handleBeginGame(state, eventMsg.beginGameEvent);
  }
  if (eventMsg.dealHandEvent) {
    return handleDealHand(state, eventMsg.dealHandEvent);
  }
  if (eventMsg.drawTileEvent) {
    return handleDrawTile(state, eventMsg.drawTileEvent);
  }
  if (eventMsg.addTileEvent) {
    return handleAddTile(state, eventMsg.addTileEvent);
  }
  if (eventMsg.discardTileEvent) {
    return handleDiscardTile(state, eventMsg.discardTileEvent);
  }
  if (eventMsg.claimTileEvent) {
    return handleClaimTile(state, eventMsg.claimTileEvent);
  }
  if (eventMsg.kanEvent) {
    return handleKan(state, eventMsg.kanEvent);
  }
  if (eventMsg.addKanEvent) {
    return state;
  }
  if (eventMsg.nukiDoraEvent) {
    // The set-aside is applied on addNukiDoraEvent (which the server only sends
    // once the 搶拔北 window closes without a robber).
    return state;
  }
  if (eventMsg.addNukiDoraEvent) {
    return handleNukiDora(state, eventMsg.addNukiDoraEvent);
  }
  if (eventMsg.nextPlayerEvent) {
    return handleNextPlayer(state, eventMsg.nextPlayerEvent);
  }
  if (eventMsg.increaseJunEvent) {
    return handleIncreaseJun(state, eventMsg.increaseJunEvent);
  }
  if (eventMsg.revealDoraEvent) {
    return handleRevealDora(state, eventMsg.revealDoraEvent);
  }
  if (eventMsg.setRiichiEvent) {
    return handleSetRiichi(state, eventMsg.setRiichiEvent);
  }
  if (eventMsg.setFuritenEvent) {
    return handleSetFuriten(state, eventMsg.setFuritenEvent);
  }
  if (eventMsg.dealerFirstTurnEvent) {
    return handleDealerFirstTurn(state, eventMsg.dealerFirstTurnEvent);
  }
  if (eventMsg.agariEvent) {
    return handleAgari(state, eventMsg.agariEvent);
  }
  if (eventMsg.applyScoreEvent) {
    return handleApplyScore(state, eventMsg.applyScoreEvent);
  }
  if (eventMsg.concludeGameEvent) {
    return handleConcludeGame(state, eventMsg.concludeGameEvent);
  }
  if (eventMsg.nextGameEvent) {
    return handleNextGame(state, eventMsg.nextGameEvent);
  }
  if (eventMsg.stopGameEvent) {
    return handleStopGame(state, eventMsg.stopGameEvent);
  }
  if (eventMsg.syncGameStateEvent) {
    return handleSyncGameState(state, eventMsg.syncGameStateEvent);
  }
  if (eventMsg.ryuukyokuEvent) {
    return handleRyuukyoku(state, eventMsg.ryuukyokuEvent);
  }
  if (eventMsg.endInquiryEvent) {
    return state;
  }

  return state;
}

export function applyRoomState(
  state: RoomModel | null,
  msg: IServerRoomStateMsg | null,
): RoomModel | null {
  if (!msg) {
    return null;
  }
  const players = (msg.players ?? []).map((p): PlayerModel => {
    const existingPlayer = state?.players.find((ep) => ep.id === p.id);
    const player: PlayerModel = {
      id: p.id ?? -1,
      nickname: p.nickname ?? '',
      status: p.status ?? 0,
      gameState: existingPlayer?.gameState ?? null,
      aiType: p.aiType ?? AiType.AI_TYPE_NONE,
    };
    if (p.seat !== null && p.seat !== undefined) {
      player.seat = p.seat;
    }
    return player;
  });

  return {
    id: msg.id ?? state?.id ?? -1,
    config: msg.config ?? state?.config ?? null,
    info: state?.info ?? null,
    players,
    tileRegistry: state?.tileRegistry ?? createEmptyTileRegistry(),
    ryuukyokuReason: state?.ryuukyokuReason ?? null,
    gameEnded: state?.gameEnded ?? false,
    endGamePoints: state?.endGamePoints ?? null,
    concludedPlayers: state?.concludedPlayers ?? null,
    // Preserve the frozen round result so a player leaving mid-result (which
    // arrives as a shrunken room-state snapshot) cannot alter the settlement.
    roundResultPlayers: state?.roundResultPlayers ?? null,
    gameId: state?.gameId ?? null,
  };
}
