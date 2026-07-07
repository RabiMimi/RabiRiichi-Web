import { describe, it, expect } from 'vitest';
import {
  hydrateFromGameState,
  applyEvent,
  applyRoomState,
  KNOWN_EVENTS,
} from './reducer';
import type { RoomModel } from './model';
import { createEmptyTileRegistry, getRegisteredTile } from './tileRegistry';
import { getRiichiSidewaysTraceId } from './river';
import { GameLogMsg, type IServerRoomStateMsg } from '../proto';
import type { IEventMsg } from '../proto';
import {
  UserStatus,
  FuritenType,
  TileSource,
  AiType,
  type IGameStateMsg,
  type IGameTileMsg,
  type IMenLikeMsg,
} from '../proto';

describe('Reducer - Hydration', () => {
  it('should hydrate room state from empty room', () => {
    const initialState: RoomModel = {
      id: 1234,
      config: null,
      info: null,
      players: [],
      tileRegistry: createEmptyTileRegistry(),
    };

    const snapshot: IGameStateMsg = {
      config: {
        playerCount: 2,
        pointThreshold: {
          initialPoints: 25000,
          riichiPoints: 1000,
        },
      },
      info: {
        round: 2,
        dealer: 1,
        honba: 1,
        riichiStick: 1,
        currentPlayer: 1,
      },
      wall: {
        doras: [{ traceId: 99, tile: 17 }], // 1m
        remaining: 68,
        rinshanRemaining: 4,
      },
      players: [
        {
          id: 0,
          points: 24000,
          hand: {
            freeTiles: [
              { traceId: 101, tile: 17 },
              { traceId: 102, tile: 18 },
            ],
            called: [],
            discarded: [{ traceId: 103, tile: 19 }],
            jun: 3,
            isDiscardFuriten: true,
            isRiichiFuriten: false,
            isTempFuriten: false,
          },
        },
        {
          id: 1,
          points: 26000,
          hand: {
            freeTiles: [{ traceId: 201, tile: 33 }],
            called: [],
            discarded: [],
            jun: 3,
            isDiscardFuriten: false,
            isRiichiFuriten: false,
            isTempFuriten: false,
          },
        },
      ],
      currentPlayer: 1,
    };

    const nextState = hydrateFromGameState(initialState, snapshot);

    expect(nextState.id).toBe(1234);
    expect(nextState.config).toEqual(snapshot.config);
    expect(nextState.info).not.toBeNull();
    expect(nextState.info?.round).toBe(2);
    expect(nextState.info?.dealer).toBe(1);
    expect(nextState.info?.honba).toBe(1);
    expect(nextState.info?.riichiStick).toBe(1);
    expect(nextState.info?.remainingTiles).toBe(68);
    expect(nextState.info?.currentPlayer).toBe(1);
    expect(nextState.info?.doras).toEqual([{ traceId: 99, tile: 17 }]);

    expect(nextState.players).toHaveLength(2);

    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0).toBeDefined();
    expect(p0?.status).toBe(UserStatus.USER_STATUS_PLAYING);
    expect(p0?.gameState).not.toBeNull();
    expect(p0?.gameState?.points).toBe(24000);
    expect(p0?.gameState?.jun).toBe(3);
    expect(p0?.gameState?.furiten[FuritenType.FURITEN_TYPE_DISCARD]).toBe(true);
    expect(p0?.gameState?.furiten[FuritenType.FURITEN_TYPE_RIICHI]).toBe(false);
    expect(p0?.gameState?.hand.freeTiles).toHaveLength(2);
    expect(p0?.gameState?.hand.freeTiles[0]?.traceId).toBe(101);
    expect(p0?.gameState?.hand.discarded).toHaveLength(1);
    expect(p0?.gameState?.hand.discarded[0]?.traceId).toBe(103);

    const p1 = nextState.players.find((p) => p.seat === 1);
    expect(p1).toBeDefined();
    expect(p1?.gameState?.points).toBe(26000);
    expect(p1?.gameState?.hand.freeTiles).toHaveLength(1);
  });

  it('should update existing players in room preserving nicknames', () => {
    const initialState: RoomModel = {
      id: 1234,
      config: null,
      info: null,
      players: [
        {
          id: 1001,
          nickname: 'Alice',
          status: UserStatus.USER_STATUS_READY,
          seat: 0,
          gameState: null,
          aiType: AiType.AI_TYPE_NONE,
        },
        {
          id: 1002,
          nickname: 'Bob',
          status: UserStatus.USER_STATUS_READY,
          seat: 1,
          gameState: null,
          aiType: AiType.AI_TYPE_NONE,
        },
      ],
      tileRegistry: createEmptyTileRegistry(),
    };

    const snapshot: IGameStateMsg = {
      config: null,
      info: {
        round: 1,
        dealer: 0,
        honba: 0,
        riichiStick: 0,
        currentPlayer: 0,
      },
      wall: {
        doras: [],
        remaining: 70,
        rinshanRemaining: 4,
      },
      players: [
        {
          id: 0,
          points: 25000,
          hand: {
            freeTiles: [],
            called: [],
            discarded: [],
            jun: 0,
          },
        },
        {
          id: 1,
          points: 25000,
          hand: {
            freeTiles: [],
            called: [],
            discarded: [],
            jun: 0,
          },
        },
      ],
      currentPlayer: 0,
    };

    const nextState = hydrateFromGameState(initialState, snapshot);

    expect(nextState.players).toHaveLength(2);
    const p0 = nextState.players.find((p) => p.id === 1001);
    expect(p0).toBeDefined();
    expect(p0?.nickname).toBe('Alice');
    expect(p0?.seat).toBe(0);
    expect(p0?.status).toBe(UserStatus.USER_STATUS_PLAYING);
    expect(p0?.gameState).not.toBeNull();

    const p1 = nextState.players.find((p) => p.id === 1002);
    expect(p1).toBeDefined();
    expect(p1?.nickname).toBe('Bob');
    expect(p1?.seat).toBe(1);
    expect(p1?.status).toBe(UserStatus.USER_STATUS_PLAYING);
    expect(p1?.gameState).not.toBeNull();
  });
});

function createInitializedRoom(): RoomModel {
  return {
    id: 1234,
    config: {
      playerCount: 2,
      pointThreshold: {
        initialPoints: 25000,
        riichiPoints: 1000,
      },
    },
    info: {
      round: 0,
      dealer: 0,
      honba: 0,
      riichiStick: 0,
      remainingTiles: 100,
      currentPlayer: 0,
      doras: [],
      uradoras: [],
      revealedDoraCount: 0,
    },
    players: [
      {
        id: 101,
        nickname: 'Alice',
        status: UserStatus.USER_STATUS_PLAYING,
        seat: 0,
        gameState: {
          jun: 0,
          points: 25000,
          riichiTileId: 0,
          furiten: {},
          hand: {
            freeTiles: [],
            called: [],
            discarded: [],
            pendingTile: null,
          },
          agari: null,
        },
        aiType: AiType.AI_TYPE_NONE,
      },
      {
        id: 102,
        nickname: 'Bob',
        status: UserStatus.USER_STATUS_PLAYING,
        seat: 1,
        gameState: {
          jun: 0,
          points: 25000,
          riichiTileId: 0,
          furiten: {},
          hand: {
            freeTiles: [],
            called: [],
            discarded: [],
            pendingTile: null,
          },
          agari: null,
        },
        aiType: AiType.AI_TYPE_NONE,
      },
    ],
    tileRegistry: createEmptyTileRegistry(),
  };
}

// Helpers to modify state in tests without using non-null assertions
function setPendingTile(
  state: RoomModel,
  seat: number,
  tile: IGameTileMsg | null,
) {
  const p = state.players.find((player) => player.seat === seat);
  if (p?.gameState) {
    p.gameState.hand.pendingTile = tile;
  }
}

function setFreeTiles(state: RoomModel, seat: number, tiles: IGameTileMsg[]) {
  const p = state.players.find((player) => player.seat === seat);
  if (p?.gameState) {
    p.gameState.hand.freeTiles = tiles;
  }
}

function setDiscardedTiles(
  state: RoomModel,
  seat: number,
  tiles: IGameTileMsg[],
) {
  const p = state.players.find((player) => player.seat === seat);
  if (p?.gameState) {
    p.gameState.hand.discarded = tiles;
  }
}

function setCalled(state: RoomModel, seat: number, called: IMenLikeMsg[]) {
  const p = state.players.find((player) => player.seat === seat);
  if (p?.gameState) {
    p.gameState.hand.called = called;
  }
}

describe('Reducer - Events', () => {
  it('should handle beginGameEvent', () => {
    const state = createInitializedRoom();
    // Reset info to null to verify it gets populated
    state.info = null;

    const eventMsg = {
      beginGameEvent: {
        round: 1,
        dealer: 0,
        honba: 0,
        riichiStick: 0,
        remainingTiles: 122,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info).not.toBeNull();
    expect(nextState.info?.round).toBe(1);
    expect(nextState.info?.dealer).toBe(0);
    expect(nextState.info?.remainingTiles).toBe(122);
    expect(nextState.info?.currentPlayer).toBe(0);

    expect(nextState.players[0]?.gameState?.points).toBe(25000);
  });

  it('preserves accumulated points across rounds on beginGameEvent', () => {
    // Points accumulate over the whole game; beginGameEvent (start of each
    // round) must NOT reset them to initialPoints.
    const state = createInitializedRoom();
    const p0 = state.players[0];
    const p1 = state.players[1];
    if (p0?.gameState) p0.gameState.points = 32100;
    if (p1?.gameState) p1.gameState.points = 17900;

    const nextState = applyEvent(state, {
      beginGameEvent: { round: 1, dealer: 1, honba: 0 },
    });

    expect(nextState.players[0]?.gameState?.points).toBe(32100);
    expect(nextState.players[1]?.gameState?.points).toBe(17900);
  });

  it('uses configured initialPoints for the first round (no prior state)', () => {
    const state = createInitializedRoom();
    // Simulate a fresh game with no per-player gameState yet.
    state.players = state.players.map((p) => ({ ...p, gameState: null }));

    const nextState = applyEvent(state, {
      beginGameEvent: { round: 0, dealer: 0, honba: 0 },
    });

    expect(nextState.players[0]?.gameState?.points).toBe(25000);
    expect(nextState.players[1]?.gameState?.points).toBe(25000);
  });

  it('should handle dealHandEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      dealHandEvent: {
        playerId: 0,
        count: 4,
        tiles: [
          { traceId: 10, tile: 17 }, // 1m
          { traceId: 11, tile: 18 }, // 2m
          { traceId: 12, tile: 19 }, // 3m
          { traceId: 13, tile: 20 }, // 4m
        ],
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info?.remainingTiles).toBe(96); // 100 - 4
    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.hand.freeTiles).toHaveLength(4);
    expect(p0?.gameState?.hand.freeTiles[0]?.traceId).toBe(10);
  });

  it('should handle drawTileEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      drawTileEvent: {
        playerId: 0,
        source: TileSource.TILE_SOURCE_WALL,
        tile: { traceId: 50, tile: 21 }, // 5m
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info?.remainingTiles).toBe(99); // 100 - 1
    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.hand.pendingTile).not.toBeNull();
    expect(p0?.gameState?.hand.pendingTile?.traceId).toBe(50);
  });

  it('should handle addTileEvent', () => {
    const state = createInitializedRoom();
    // Pre-populate pending tile safely
    setPendingTile(state, 0, { traceId: 50, tile: 21 });

    const eventMsg = {
      addTileEvent: {
        playerId: 0,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.hand.pendingTile).toBeNull();
    expect(p0?.gameState?.hand.freeTiles).toHaveLength(1);
    expect(p0?.gameState?.hand.freeTiles[0]?.traceId).toBe(50);
  });

  it('should handle discardTileEvent (tsumogiri / discard pending)', () => {
    const state = createInitializedRoom();
    setPendingTile(state, 0, { traceId: 50, tile: 21 });

    const eventMsg = {
      discardTileEvent: {
        playerId: 0,
        discarded: { traceId: 50, tile: 21 },
        reason: 1, // DISCARD_REASON_DRAW
        fromHand: false,
        isRiichi: false,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.hand.pendingTile).toBeNull();
    expect(p0?.gameState?.hand.freeTiles).toHaveLength(0);
    expect(p0?.gameState?.hand.discarded).toHaveLength(1);
    expect(p0?.gameState?.hand.discarded[0]?.traceId).toBe(50);
  });

  it('should handle discardTileEvent (discard from hand, auto sorting pending)', () => {
    const state = createInitializedRoom();
    // Hand has 1m, and drawn 5m
    setFreeTiles(state, 0, [{ traceId: 10, tile: 17 }]);
    setPendingTile(state, 0, { traceId: 50, tile: 21 });

    const eventMsg = {
      discardTileEvent: {
        playerId: 0,
        discarded: { traceId: 10, tile: 17 },
        reason: 1,
        fromHand: true,
        isRiichi: false,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.hand.pendingTile).toBeNull(); // Pending moved to free
    expect(p0?.gameState?.hand.freeTiles).toHaveLength(1);
    expect(p0?.gameState?.hand.freeTiles[0]?.traceId).toBe(50); // 5m is now in hand
    expect(p0?.gameState?.hand.discarded).toHaveLength(1);
    expect(p0?.gameState?.hand.discarded[0]?.traceId).toBe(10); // 1m discarded
  });

  it('should handle claimTileEvent (Pon claim)', () => {
    const state = createInitializedRoom();
    // Player 0 has two 1m in hand
    setFreeTiles(state, 0, [
      { traceId: 10, tile: 17 },
      { traceId: 11, tile: 17 },
    ]);
    // Player 1 discarded a 1m
    const discardedTile = {
      traceId: 99,
      tile: 17,
      discardInfo: { from: 1, reason: 1, time: 5 },
    };
    setDiscardedTiles(state, 1, [discardedTile]);

    const eventMsg = {
      claimTileEvent: {
        playerId: 0,
        tile: discardedTile,
        group: {
          tiles: [
            { traceId: 10, tile: 17 },
            { traceId: 11, tile: 17 },
            discardedTile,
          ],
        },
        reason: 4, // DISCARD_REASON_PON
      },
    };

    const nextState = applyEvent(state, eventMsg);

    // Verify removed from Player 1's discard
    const p1 = nextState.players.find((p) => p.seat === 1);
    expect(p1?.gameState?.hand.discarded).toHaveLength(0);

    // Verify claimer's hand
    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.hand.freeTiles).toHaveLength(0); // Two 1m removed
    expect(p0?.gameState?.hand.called).toHaveLength(1);
    expect(p0?.gameState?.hand.called[0]?.tiles).toHaveLength(3);
    expect(p0?.gameState?.hand.called[0]?.tiles?.[2]?.traceId).toBe(99);
  });

  it('should handle kanEvent (Ankan)', () => {
    const state = createInitializedRoom();
    // Player 0 has four 1m in hand
    setFreeTiles(state, 0, [
      { traceId: 10, tile: 17 },
      { traceId: 11, tile: 17 },
      { traceId: 12, tile: 17 },
      { traceId: 13, tile: 17 },
    ]);

    const eventMsg = {
      kanEvent: {
        playerId: 0,
        kan: {
          tiles: [
            { traceId: 10, tile: 17 },
            { traceId: 11, tile: 17 },
            { traceId: 12, tile: 17 },
            { traceId: 13, tile: 17 },
          ],
        },
        incoming: { traceId: 13, tile: 17 }, // Last tile drawn triggers it
        kanSource: TileSource.TILE_SOURCE_ANKAN,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.hand.freeTiles).toHaveLength(0);
    expect(p0?.gameState?.hand.called).toHaveLength(1);
    expect(p0?.gameState?.hand.called[0]?.tiles).toHaveLength(4);
  });

  it('should handle kanEvent (Kakan)', () => {
    const state = createInitializedRoom();
    // Player 0 already has a Pon of 1m
    setCalled(state, 0, [
      {
        tiles: [
          { traceId: 10, tile: 17 },
          { traceId: 11, tile: 17 },
          { traceId: 99, tile: 17, discardInfo: { from: 1 } },
        ],
      },
    ]);
    // And has the fourth 1m in hand (pending)
    setPendingTile(state, 0, { traceId: 12, tile: 17 });

    const eventMsg = {
      kanEvent: {
        playerId: 0,
        kan: {
          tiles: [
            { traceId: 10, tile: 17 },
            { traceId: 11, tile: 17 },
            { traceId: 99, tile: 17, discardInfo: { from: 1 } },
            { traceId: 12, tile: 17 },
          ],
        },
        incoming: { traceId: 12, tile: 17 },
        kanSource: TileSource.TILE_SOURCE_KAKAN,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.hand.pendingTile).toBeNull();
    expect(p0?.gameState?.hand.called).toHaveLength(1);
    expect(p0?.gameState?.hand.called[0]?.tiles).toHaveLength(4);
    expect(p0?.gameState?.hand.called[0]?.tiles?.[3]?.traceId).toBe(12);
  });

  it('should handle nextPlayerEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      nextPlayerEvent: {
        playerId: 0,
        nextPlayerId: 1,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info?.currentPlayer).toBe(1);
  });

  it('should handle increaseJunEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      increaseJunEvent: {
        playerId: 1,
        increasedJun: 5,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info?.currentPlayer).toBe(1);
    expect(nextState.players[1]?.gameState?.jun).toBe(5);
  });

  it('should handle revealDoraEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      revealDoraEvent: {
        playerId: -1,
        dora: { traceId: 999, tile: 25 }, // 9m
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info?.doras).toHaveLength(1);
    expect(nextState.info?.doras[0]?.traceId).toBe(999);
  });

  it('should handle setRiichiEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      setRiichiEvent: {
        playerId: 0,
        riichiTile: { traceId: 50, tile: 21 },
        riichi: true,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.players[0]?.gameState?.riichiTileId).toBe(50);
    // Declaring riichi deducts the 1000-point stick and adds it to the pot.
    expect(nextState.players[0]?.gameState?.points).toBe(24000);
    expect(nextState.info?.riichiStick).toBe(1);
  });

  it('keeps the riichi sideways tile after the declaration tile is called', () => {
    // Player 1 declares riichi by discarding tile 50, then player 0 pons it,
    // then player 1 discards tile 60. The sideways tile must move from 50 to 60.
    let state = createInitializedRoom();

    state = applyEvent(state, {
      discardTileEvent: {
        playerId: 1,
        discarded: {
          traceId: 50,
          tile: 21,
          discardInfo: { from: 1, reason: 1, time: 10 },
        },
        isRiichi: true,
      },
    });

    // Sanity: declaration tile is registered and currently the sideways tile.
    expect(getRegisteredTile(state.tileRegistry, 50)?.discardInfo?.time).toBe(
      10,
    );
    const riichiTileId = state.players[1]?.gameState?.riichiTileId ?? 0;
    expect(riichiTileId).toBe(50);
    expect(
      getRiichiSidewaysTraceId(
        state.players[1]?.gameState?.hand.discarded ?? [],
        riichiTileId,
        state.tileRegistry,
      ),
    ).toBe(50);

    // Player 0 pons the riichi tile (50), removing it from player 1's river.
    state = applyEvent(state, {
      claimTileEvent: {
        playerId: 0,
        tile: {
          traceId: 50,
          tile: 21,
          discardInfo: { from: 1, reason: 1, time: 10 },
        },
        group: {
          tiles: [
            { traceId: 40, tile: 21 },
            { traceId: 41, tile: 21 },
            { traceId: 50, tile: 21 },
          ],
        },
        reason: 4,
      },
    });

    const riverAfterClaim = state.players[1]?.gameState?.hand.discarded ?? [];
    expect(riverAfterClaim.some((t) => t.traceId === 50)).toBe(false);
    // The registry still remembers the called-away declaration tile.
    expect(getRegisteredTile(state.tileRegistry, 50)?.discardInfo?.time).toBe(
      10,
    );

    // Player 1 discards again (tile 60).
    state = applyEvent(state, {
      discardTileEvent: {
        playerId: 1,
        discarded: {
          traceId: 60,
          tile: 22,
          discardInfo: { from: 1, reason: 1, time: 20 },
        },
        isRiichi: false,
      },
    });

    // riichiTileId still points at the original declaration (matches server).
    expect(state.players[1]?.gameState?.riichiTileId).toBe(50);
    // But the rendered sideways tile is now the next surviving discard, 60.
    expect(
      getRiichiSidewaysTraceId(
        state.players[1]?.gameState?.hand.discarded ?? [],
        state.players[1]?.gameState?.riichiTileId ?? 0,
        state.tileRegistry,
      ),
    ).toBe(60);
  });

  it('clears the tile registry on beginGameEvent', () => {
    let state = createInitializedRoom();
    state = applyEvent(state, {
      discardTileEvent: {
        playerId: 0,
        discarded: { traceId: 7, tile: 21 },
      },
    });
    expect(state.tileRegistry.size).toBeGreaterThan(0);

    state = applyEvent(state, {
      beginGameEvent: { round: 0, dealer: 0, remainingTiles: 70 },
    });
    expect(state.tileRegistry.size).toBe(0);
  });

  it('should handle setFuritenEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      setFuritenEvent: {
        playerId: 0,
        furiten: true,
        furitenType: FuritenType.FURITEN_TYPE_TEMP,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(
      nextState.players[0]?.gameState?.furiten[FuritenType.FURITEN_TYPE_TEMP],
    ).toBe(true);
  });

  it('should handle dealerFirstTurnEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      dealerFirstTurnEvent: {
        playerId: 0,
        incoming: { traceId: 50, tile: 21 },
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.players[0]?.gameState?.hand.pendingTile?.traceId).toBe(50);
  });

  it('should handle agariEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      agariEvent: {
        agariInfos: [
          {
            playerId: 0,
            freeTiles: [
              { traceId: 10, tile: 17 },
              { traceId: 11, tile: 18 },
            ],
            scores: { result: { han: 3, fu: 40 } },
          },
        ],
        incoming: { traceId: 50, tile: 19 },
      },
    };

    const nextState = applyEvent(state, eventMsg);

    const p0 = nextState.players.find((p) => p.seat === 0);
    expect(p0?.gameState?.agari).not.toBeNull();
    expect(p0?.gameState?.agari?.incoming?.traceId).toBe(50);
    expect(p0?.gameState?.agari?.scores?.result?.han).toBe(3);
    expect(p0?.gameState?.hand.freeTiles).toHaveLength(2);
  });

  it('should handle applyScoreEvent', () => {
    const state = createInitializedRoom();
    // Pre-populate agari for Player 0 (won) and Player 1 (lost) safely
    const p0Raw = state.players[0];
    const p1Raw = state.players[1];
    if (p0Raw?.gameState && p1Raw?.gameState) {
      p0Raw.gameState.agari = { gainPoints: 0, losePoints: 0 };
      p1Raw.gameState.agari = { gainPoints: 0, losePoints: 0 };
    }

    const eventMsg = {
      applyScoreEvent: {
        scoreChange: [
          {
            from: 1,
            to: 0,
            points: 3900,
            reason: 1, // AGARI
          },
        ],
      },
    };

    const nextState = applyEvent(state, eventMsg);

    const p0 = nextState.players.find((p) => p.seat === 0);
    const p1 = nextState.players.find((p) => p.seat === 1);

    expect(p0?.gameState?.points).toBe(28900); // 25000 + 3900
    expect(p0?.gameState?.agari?.gainPoints).toBe(3900);

    expect(p1?.gameState?.points).toBe(21100); // 25000 - 3900
    expect(p1?.gameState?.agari?.losePoints).toBe(3900);
  });

  it('should handle concludeGameEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      concludeGameEvent: {
        doras: [{ traceId: 90, tile: 17 }],
        uradoras: [{ traceId: 91, tile: 18 }],
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info?.doras).toHaveLength(1);
    expect(nextState.info?.doras[0]?.traceId).toBe(90);
    expect(nextState.info?.uradoras).toHaveLength(1);
    expect(nextState.info?.uradoras[0]?.traceId).toBe(91);
  });

  it('should handle nextGameEvent by advancing round metadata only', () => {
    // nextGameEvent fires BEFORE the next_round ack inquiry and beginGameEvent.
    // It must advance the round but NOT clear per-player hand/agari state, so
    // the result panel stays visible until the next hand actually begins.
    const state = createInitializedRoom();
    setFreeTiles(state, 0, [{ traceId: 10, tile: 17 }]);
    setPendingTile(state, 0, { traceId: 50, tile: 21 });
    const p0 = state.players[0];
    if (p0?.gameState) {
      p0.gameState.points = 28900;
      p0.gameState.agari = {
        scores: { result: { han: 3, fu: 40 } },
        gainPoints: 3900,
        losePoints: 0,
      };
    }

    const eventMsg = {
      nextGameEvent: {
        nextRound: 1,
        nextDealer: 1,
        nextHonba: 1,
        riichiStick: 0,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info?.round).toBe(1);
    expect(nextState.info?.dealer).toBe(1);
    expect(nextState.info?.honba).toBe(1);

    const nextP0 = nextState.players.find((p) => p.seat === 0);
    expect(nextP0?.gameState?.points).toBe(28900); // Points preserved
    // Result and hand are preserved until beginGameEvent clears them.
    expect(nextP0?.gameState?.agari?.scores?.result?.han).toBe(3);
    expect(nextP0?.gameState?.hand.freeTiles).toHaveLength(1);
    expect(nextP0?.gameState?.hand.pendingTile).not.toBeNull();
  });

  it('clears the previous hand result on beginGameEvent', () => {
    // The full per-hand reset (incl. clearing agari) happens here, after the
    // next_round acknowledgment, when the next hand starts dealing.
    const state = createInitializedRoom();
    const p0 = state.players[0];
    if (p0?.gameState) {
      p0.gameState.agari = {
        scores: { result: { han: 3, fu: 40 } },
        gainPoints: 3900,
        losePoints: 0,
      };
    }

    const nextState = applyEvent(state, {
      beginGameEvent: { round: 1, dealer: 1, honba: 1 },
    });

    const nextP0 = nextState.players.find((p) => p.seat === 0);
    expect(nextP0?.gameState?.agari).toBeNull();
    expect(nextP0?.gameState?.hand.freeTiles).toHaveLength(0);
  });

  it('should handle stopGameEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      stopGameEvent: {
        endGamePoints: [28000, 22000],
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.gameEnded).toBe(true);
    expect(nextState.endGamePoints).toEqual([28000, 22000]);
    expect(nextState.info).not.toBeNull();
    expect(nextState.players[0]?.gameState).not.toBeNull();
  });

  it('should handle syncGameStateEvent by hydrating', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      syncGameStateEvent: {
        playerId: 0,
        gameState: {
          config: { playerCount: 2 },
          info: { round: 2, dealer: 0 },
          wall: { remaining: 70 },
          players: [
            { id: 0, points: 25000 },
            { id: 1, points: 25000 },
          ],
        },
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info?.round).toBe(2);
    expect(nextState.info?.remainingTiles).toBe(70);
  });

  it('should ignore addKanEvent (Kakan) when preceded by kanEvent (Kakan)', () => {
    const state = createInitializedRoom();
    // Player 0 already has a Pon of 1m
    setCalled(state, 0, [
      {
        tiles: [
          { traceId: 10, tile: 17 },
          { traceId: 11, tile: 17 },
          { traceId: 99, tile: 17, discardInfo: { from: 1 } },
        ],
      },
    ]);
    // And has the fourth 1m in hand (pending)
    setPendingTile(state, 0, { traceId: 12, tile: 17 });

    const kanEventMsg = {
      kanEvent: {
        playerId: 0,
        kan: {
          tiles: [
            { traceId: 10, tile: 17 },
            { traceId: 11, tile: 17 },
            { traceId: 99, tile: 17, discardInfo: { from: 1 } },
            { traceId: 12, tile: 17 },
          ],
        },
        incoming: { traceId: 12, tile: 17 },
        kanSource: TileSource.TILE_SOURCE_KAKAN,
      },
    };

    const addKanEventMsg = {
      addKanEvent: {
        playerId: 0,
        kan: {
          tiles: [
            { traceId: 10, tile: 17 },
            { traceId: 11, tile: 17 },
            { traceId: 99, tile: 17, discardInfo: { from: 1 } },
            { traceId: 12, tile: 17 },
          ],
        },
        incoming: { traceId: 12, tile: 17 },
        kanSource: TileSource.TILE_SOURCE_KAKAN,
      },
    };

    // Apply kanEvent first (does the actual mutation)
    const stateAfterKan = applyEvent(state, kanEventMsg);

    const p0AfterKan = stateAfterKan.players.find((p) => p.seat === 0);
    expect(p0AfterKan?.gameState?.hand.pendingTile).toBeNull();
    expect(p0AfterKan?.gameState?.hand.called).toHaveLength(1);
    expect(p0AfterKan?.gameState?.hand.called[0]?.tiles).toHaveLength(4);

    // Apply addKanEvent (should be a clean no-op)
    const finalState = applyEvent(stateAfterKan, addKanEventMsg);

    const p0Final = finalState.players.find((p) => p.seat === 0);
    // Should preserve the exact state after kanEvent (no extra tiles removed)
    expect(p0Final?.gameState?.hand.pendingTile).toBeNull();
    expect(p0Final?.gameState?.hand.called).toHaveLength(1);
    expect(p0Final?.gameState?.hand.called[0]?.tiles).toHaveLength(4);
    expect(p0Final?.gameState?.hand.called[0]?.tiles?.[3]?.traceId).toBe(12);
  });

  it('should handle ryuukyokuEvent by setting empty agari results', () => {
    const state = createInitializedRoom();

    const eventMsg = {
      ryuukyokuEvent: {
        scoreChange: [],
      },
    };

    const nextState = applyEvent(state, eventMsg);

    for (const p of nextState.players) {
      expect(p.gameState?.agari).not.toBeNull();
      expect(p.gameState?.agari?.gainPoints).toBe(0);
      expect(p.gameState?.agari?.losePoints).toBe(0);
      expect(p.gameState?.agari?.scores).toBeUndefined();
    }
  });

  it('should handle ryuukyokuEvent with midGameRyuukyoku reason', () => {
    const state = createInitializedRoom();

    const eventMsg = {
      ryuukyokuEvent: {
        scoreChange: [],
        midGameRyuukyoku: {
          name: 'suufon_renda',
        },
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.ryuukyokuReason).toBe('suufon_renda');
  });

  it('should reset ryuukyokuReason on beginGameEvent', () => {
    const state = createInitializedRoom();
    state.ryuukyokuReason = 'suufon_renda';

    const eventMsg = {
      beginGameEvent: {
        round: 1,
        dealer: 0,
        honba: 0,
        riichiStick: 0,
        remainingTiles: 122,
      },
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.ryuukyokuReason).toBeNull();
  });

  it('should handle ryuukyokuEvent with single or multiple Nagashi Mangan players', () => {
    const state = createInitializedRoom();

    const eventMsg = {
      ryuukyokuEvent: {
        scoreChange: [],
        endGameRyuukyoku: {
          remainingPlayers: [0, 1],
          nagashiManganPlayers: [0, 1],
          tenpaiPlayers: [],
        },
      },
    };

    const nextState = applyEvent(state, eventMsg);

    const p0 = nextState.players.find((p) => p.seat === 0);
    const p1 = nextState.players.find((p) => p.seat === 1);

    expect(p0?.gameState?.agari).not.toBeNull();
    expect(p0?.gameState?.agari?.isNagashi).toBe(true);
    expect(p0?.gameState?.agari?.scores?.items?.[0]?.Src).toBe('NagashiMangan');
    expect(p0?.gameState?.agari?.scores?.items?.[0]?.Val).toBe(5);

    expect(p1?.gameState?.agari).not.toBeNull();
    expect(p1?.gameState?.agari?.isNagashi).toBe(true);
    expect(p1?.gameState?.agari?.scores?.items?.[0]?.Src).toBe('NagashiMangan');
    expect(p1?.gameState?.agari?.scores?.items?.[0]?.Val).toBe(5);
  });

  it('should handle ryuukyokuEvent with tenpai players and reveal their hand tiles', () => {
    const state = createInitializedRoom();
    const alice = state.players.find((p) => p.seat === 0)!;
    alice.gameState!.hand.freeTiles = [
      { traceId: 1, tile: 0 },
      { traceId: 2, tile: 0 },
    ];

    const eventMsg = {
      ryuukyokuEvent: {
        scoreChange: [],
        endGameRyuukyoku: {
          remainingPlayers: [0, 1],
          nagashiManganPlayers: [],
          tenpaiPlayers: [0],
          revealedTiles: [
            { traceId: 1, tile: 17, playerId: 0 },
            { traceId: 2, tile: 18, playerId: 0 },
          ],
        },
      },
    };

    const nextState = applyEvent(state, eventMsg);
    const p0 = nextState.players.find((p) => p.seat === 0)!;
    const p1 = nextState.players.find((p) => p.seat === 1)!;

    expect(p0.gameState?.agari?.isTenpai).toBe(true);
    expect(p0.gameState?.hand.freeTiles).toEqual([
      { traceId: 1, tile: 17, playerId: 0 },
      { traceId: 2, tile: 18, playerId: 0 },
    ]);

    expect(p1.gameState?.agari?.isTenpai).toBeFalsy();
  });

  it('keeps the winner result through the full end-of-hand sequence', () => {
    // Regression: live order is agari -> applyScore -> conclude -> nextGame,
    // all sent before the next_round ack inquiry. nextGame previously wiped
    // agari, so the result panel rendered "Draw". The win result must survive
    // until beginGameEvent (the next hand) clears it.
    let state = createInitializedRoom();

    state = applyEvent(state, {
      agariEvent: {
        agariInfos: [
          {
            playerId: 1,
            scores: {
              items: [{ Type: 1, Val: 1, Src: 'Riichi' }],
              result: { han: 5, fu: 30 },
            },
            freeTiles: [{ traceId: 1, tile: 19 }],
          },
        ],
        incoming: { tile: 19, traceId: 99 },
      },
    });
    state = applyEvent(state, {
      applyScoreEvent: { scoreChange: [{ from: 0, to: 1, points: 7700 }] },
    });
    state = applyEvent(state, {
      concludeGameEvent: { doras: [], uradoras: [] },
    });
    state = applyEvent(state, {
      nextGameEvent: {
        nextRound: 1,
        nextDealer: 1,
        nextHonba: 0,
        riichiStick: 0,
      },
    });

    const winner = state.players.find(
      (p) => p.gameState?.agari?.scores != null,
    );
    expect(winner?.seat).toBe(1);
    expect(winner?.gameState?.agari?.scores?.result?.han).toBe(5);
    expect(winner?.gameState?.agari?.gainPoints).toBe(7700);

    // beginGameEvent (after the ack) finally clears the result.
    state = applyEvent(state, { beginGameEvent: { round: 1, dealer: 1 } });
    expect(
      state.players.find((p) => p.gameState?.agari?.scores != null),
    ).toBeUndefined();
  });
});

describe('Reducer - Room State', () => {
  it('should apply room state to null state', () => {
    const roomState = {
      id: 5678,
      config: { playerCount: 2 },
      players: [
        {
          id: 101,
          nickname: 'Alice',
          status: UserStatus.USER_STATUS_IN_ROOM,
          seat: 0,
        },
        {
          id: 102,
          nickname: 'Bob',
          status: UserStatus.USER_STATUS_READY,
          seat: 1,
        },
      ],
    };

    const nextState = applyRoomState(null, roomState);

    expect(nextState).not.toBeNull();
    expect(nextState?.id).toBe(5678);
    expect(nextState?.config?.playerCount).toBe(2);
    expect(nextState?.players).toHaveLength(2);
    expect(nextState?.players[0]?.nickname).toBe('Alice');
    expect(nextState?.players[1]?.status).toBe(UserStatus.USER_STATUS_READY);
    expect(nextState?.players[0]?.gameState).toBeNull();
  });

  it('should preserve gameState when applying room state to existing room', () => {
    const initialState = createInitializedRoom(); // Alice and Bob have gameState
    const roomState = {
      id: 1234,
      config: { playerCount: 2 },
      players: [
        {
          id: 101,
          nickname: 'AliceUpdated',
          status: UserStatus.USER_STATUS_PLAYING,
          seat: 0,
        },
        {
          id: 102,
          nickname: 'BobUpdated',
          status: UserStatus.USER_STATUS_PLAYING,
          seat: 1,
        },
      ],
    };

    const nextState = applyRoomState(initialState, roomState);

    expect(nextState?.players[0]?.nickname).toBe('AliceUpdated');
    expect(nextState?.players[0]?.gameState).not.toBeNull();
    expect(nextState?.players[0]?.gameState?.points).toBe(25000);
  });

  it('should preserve gameEnded and endGamePoints flags when applying room state', () => {
    const initialState: RoomModel = {
      ...createInitializedRoom(),
      gameEnded: true,
      endGamePoints: [30000, 20000],
    };

    const roomState: IServerRoomStateMsg = {
      id: 1234,
      players: [
        {
          id: 0,
          nickname: 'Alice',
          status: UserStatus.USER_STATUS_READY,
          seat: 0,
        },
      ],
    };

    const nextState = applyRoomState(initialState, roomState);

    expect(nextState?.gameEnded).toBe(true);
    expect(nextState?.endGamePoints).toEqual([30000, 20000]);
  });
});

describe('Reducer - Replay coverage (F3)', () => {
  // Returns the active oneof variant keys of an event message (usually one).
  function eventVariantKeys(event: IEventMsg): string[] {
    return Object.keys(event).filter(
      (k) =>
        !k.startsWith('$') &&
        event[k as keyof IEventMsg] !== null &&
        event[k as keyof IEventMsg] !== undefined,
    );
  }

  async function loadReplayEvents(): Promise<IEventMsg[]> {
    const { default: replayData } =
      await import('../dev/fixtures/full_game.json');
    const logMsg = GameLogMsg.fromObject(replayData);
    const events: IEventMsg[] = [];
    for (const playerLog of logMsg.playerLogs) {
      for (const log of playerLog.logs ?? []) {
        if (log.event) {
          events.push(log.event);
        }
      }
    }
    return events;
  }

  it('recorded game contains no event variant unknown to applyEvent', async () => {
    const events = await loadReplayEvents();
    expect(events.length).toBeGreaterThan(0);

    const seenVariants = new Set<string>();
    for (const event of events) {
      for (const key of eventVariantKeys(event)) {
        seenVariants.add(key);
      }
    }

    const unknownVariants = [...seenVariants].filter(
      (v) => !KNOWN_EVENTS.has(v),
    );
    expect(unknownVariants).toEqual([]);
  });

  it('applies the full recorded game without throwing', async () => {
    const events = await loadReplayEvents();

    let state: RoomModel = {
      id: 1,
      config: { playerCount: 4 },
      info: null,
      players: [0, 1, 2, 3].map((seat) => ({
        id: seat,
        nickname: `Player ${seat}`,
        status: UserStatus.USER_STATUS_PLAYING,
        seat,
        gameState: null,
        aiType: AiType.AI_TYPE_NONE,
      })),
      tileRegistry: createEmptyTileRegistry(),
    };

    expect(() => {
      for (const event of events) {
        state = applyEvent(state, event);
      }
    }).not.toThrow();
  });
});
