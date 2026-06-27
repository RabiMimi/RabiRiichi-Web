import { describe, it, expect } from 'vitest';
import {
  hydrateFromGameState,
  applyEvent,
  applyRoomState,
  KNOWN_EVENTS,
} from './reducer';
import type { RoomModel } from './model';
import { GameLogMsg } from '../proto';
import type { IEventMsg } from '../proto';
import {
  UserStatus,
  FuritenType,
  TileSource,
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
        },
        {
          id: 1002,
          nickname: 'Bob',
          status: UserStatus.USER_STATUS_READY,
          seat: 1,
          gameState: null,
        },
      ],
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
      },
    ],
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

  it('should handle nextGameEvent', () => {
    const state = createInitializedRoom();
    // Pre-populate some hand states to verify they get reset
    setFreeTiles(state, 0, [{ traceId: 10, tile: 17 }]);
    setPendingTile(state, 0, { traceId: 50, tile: 21 });
    const p0 = state.players[0];
    if (p0?.gameState) {
      p0.gameState.points = 28900; // Keep points
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
    expect(nextP0?.gameState?.hand.freeTiles).toHaveLength(0); // Hand reset
    expect(nextP0?.gameState?.hand.pendingTile).toBeNull();
  });

  it('should handle stopGameEvent', () => {
    const state = createInitializedRoom();
    const eventMsg = {
      stopGameEvent: {},
    };

    const nextState = applyEvent(state, eventMsg);

    expect(nextState.info).toBeNull();
    expect(nextState.players[0]?.gameState).toBeNull();
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
      })),
    };

    expect(() => {
      for (const event of events) {
        state = applyEvent(state, event);
      }
    }).not.toThrow();
  });
});
