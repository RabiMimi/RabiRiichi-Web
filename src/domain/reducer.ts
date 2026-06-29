import { UserStatus, FuritenType, TileSource } from '../proto/index.js';
import type {
  IGameStateMsg,
  IEventMsg,
  IBeginGameEventMsg,
  IDealHandEventMsg,
  IDrawTileEventMsg,
  IDiscardTileEventMsg,
  IClaimTileEventMsg,
  IKanEventMsg,
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
  IPlayerHandStateMsg,
} from '../proto/index.js';
import type {
  RoomModel,
  PlayerModel,
  GameInfo,
  PlayerGameState,
  PlayerAgariState,
} from './model.js';
import { Tile } from './tile.js';

/**
 * Rebuilds a player's agari (win) result from a sync snapshot so the result
 * screen survives a refresh/reconnect. The snapshot carries the winning tile
 * (`agariTile`) and the score breakdown (`agariScore`). Any agari already in
 * memory (e.g. from the live agari event) takes precedence.
 */
function reconstructAgariFromSync(
  handState: IPlayerHandStateMsg | null | undefined,
  existing: PlayerGameState | null,
): PlayerAgariState | null {
  if (existing?.agari) {
    return existing.agari;
  }
  if (!handState?.agariTile) {
    return null;
  }
  return {
    scores: handState.agariScore ?? null,
    incoming: handState.agariTile,
    gainPoints: 0,
    losePoints: 0,
  };
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

  // 2. Build Players
  let players = state.players;

  if (players.length === 0 && snapshot.players) {
    players = snapshot.players.map((sp) => ({
      id: sp.id ?? 0,
      nickname: `Player ${sp.id}`,
      status: UserStatus.USER_STATUS_PLAYING,
      seat: sp.id ?? 0,
      gameState: null,
    }));
  }

  const updatedPlayers = players.map((p): PlayerModel => {
    if (p.seat === undefined) {
      return p;
    }
    const sp = snapshot.players?.find((s) => s.id === p.seat);
    if (!sp) {
      return p;
    }

    const handState = sp.hand;
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
        freeTiles: handState?.freeTiles ?? [],
        called: handState?.called ?? [],
        discarded: handState?.discarded ?? [],
        pendingTile: handState?.pendingTile ?? null,
      },
      // Rebuild the win result from the snapshot so the result screen renders
      // correctly after a refresh/reconnect (issue #68).
      agari: reconstructAgariFromSync(handState, p.gameState),
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

function handleBeginGame(state: RoomModel, ev: IBeginGameEventMsg): RoomModel {
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

  const initialPoints = state.config?.pointThreshold?.initialPoints
    ? Number(state.config.pointThreshold.initialPoints)
    : 25000;

  const updatedPlayers = state.players.map((p): PlayerModel => {
    // beginGameEvent fires at the start of every round, but points accumulate
    // across the whole game. Preserve any existing points and only fall back to
    // the configured initial value for the very first round (no prior state).
    const initialGameState: PlayerGameState = {
      jun: 0,
      points: p.gameState?.points ?? initialPoints,
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
    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...p.gameState.hand,
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

function handleAddTile(state: RoomModel, ev: IAddTileEventMsg): RoomModel {
  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (p.seat !== ev.playerId || !p.gameState) return p;
    const pending = p.gameState.hand.pendingTile;
    if (!pending) return p;

    const freeTiles = [...p.gameState.hand.freeTiles, pending];
    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...p.gameState.hand,
          freeTiles: sortGameTiles(freeTiles),
          pendingTile: null,
        },
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
  };
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
      called = called.map((m) => {
        const isMatchingPon = m.tiles?.every((t) => {
          const tileObj = Tile.fromByte(t.tile ?? 0);
          return (
            tileObj.suit === incomingTile.suit &&
            tileObj.num === incomingTile.num
          );
        });
        if (isMatchingPon) {
          return kan;
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

  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (!p.gameState) return p;

    const agariInfo = ev.agariInfos?.find((info) => info.playerId === p.seat);
    if (!agariInfo) return p;

    const freeTiles =
      agariInfo.freeTiles && agariInfo.freeTiles.length > 0
        ? agariInfo.freeTiles
        : p.gameState.hand.freeTiles;

    const agariState: PlayerAgariState = {
      scores: agariInfo.scores ?? null,
      incoming: incoming ?? null,
      gainPoints: p.gameState.agari?.gainPoints ?? 0,
      losePoints: p.gameState.agari?.losePoints ?? 0,
    };

    return {
      ...p,
      gameState: {
        ...p.gameState,
        hand: {
          ...p.gameState.hand,
          freeTiles: sortGameTiles(freeTiles),
          pendingTile: null,
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

function handleStopGame(state: RoomModel, _ev: IStopGameEventMsg): RoomModel {
  return {
    ...state,
    info: null,
    players: state.players.map(
      (p): PlayerModel => ({
        ...p,
        gameState: null,
      }),
    ),
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
  // Initialize agari delta state to trigger Draw result panel.
  // The actual points and delta values are updated by the subsequent applyScoreEvent.
  const updatedPlayers = state.players.map((p): PlayerModel => {
    if (!p.gameState) return p;

    return {
      ...p,
      gameState: {
        ...p.gameState,
        agari: {
          gainPoints: p.gameState.agari?.gainPoints ?? 0,
          losePoints: p.gameState.agari?.losePoints ?? 0,
        },
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
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
  };
}
