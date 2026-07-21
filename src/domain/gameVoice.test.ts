import { describe, expect, it } from 'vitest';
import { DiscardReason, TileSource } from '../proto';
import type { IEventMsg } from '../proto';
import { createEmptyTileRegistry } from './tileRegistry';
import type { MappedTenpaiInfo, RoomModel } from './model';
import { Tile } from './tile';
import {
  createGameVoiceState,
  getGameVoiceSpeakerSeat,
  highestPointTenpaiIsYakuman,
  reduceGameVoice,
  type GameVoiceState,
  type GameVoiceDecision,
} from './gameVoice';

function room(
  remainingTiles = 20,
  waits: MappedTenpaiInfo[] | undefined = undefined,
): RoomModel {
  return {
    id: 1,
    config: null,
    info: {
      round: 0,
      dealer: 0,
      honba: 0,
      riichiStick: 0,
      remainingTiles,
      currentPlayer: 0,
      doras: [],
      uradoras: [],
    },
    players: [
      {
        id: 10,
        nickname: 'self',
        status: 0,
        seat: 0,
        aiType: 0,
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
            nukiDora: [],
          },
          ...(waits ? { awaitedTiles: waits } : {}),
          agari: null,
        },
      },
      {
        id: 11,
        nickname: 'opponent',
        status: 0,
        seat: 1,
        aiType: 0,
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
            nukiDora: [],
          },
          agari: null,
        },
      },
    ],
    tileRegistry: createEmptyTileRegistry(),
  };
}

function decide(
  state: GameVoiceState,
  event: IEventMsg,
  before = room(),
  after = before,
) {
  return reduceGameVoice(state, {
    event,
    before,
    after,
    selfSeat: 0,
  });
}

function wait(points: number, yakuman: number): MappedTenpaiInfo {
  return {
    winningTile: Tile.fromString('1m').toByte(),
    remainingCount: 1,
    han: 0,
    yakuHan: 0,
    fu: 0,
    yakuman,
    points,
  };
}

describe('game voice decisions', () => {
  it('routes event voices to the player who speaks them', () => {
    expect(
      getGameVoiceSpeakerSeat({ claimTileEvent: { playerId: 2 } }, 0, 'pon'),
    ).toBe(2);
    expect(
      getGameVoiceSpeakerSeat(
        { agariEvent: { agariInfos: [{ playerId: 3 }] } },
        0,
        'ron',
      ),
    ).toBe(3);
    expect(
      getGameVoiceSpeakerSeat({ beginGameEvent: {} }, 0, 'gameStart'),
    ).toBe(0);
    expect(
      getGameVoiceSpeakerSeat(
        { claimTileEvent: { playerId: 2 } },
        0,
        'opponentCalls',
      ),
    ).toBe(2);
  });

  it('plays the game-start greeting only for the first hand', () => {
    const firstHand = decide(createGameVoiceState(), { beginGameEvent: {} });
    expect(firstHand.voiceId).toBe('gameStart');
    expect(firstHand.state.playedGameStart).toBe(true);

    const secondHand = decide(firstHand.state, { beginGameEvent: {} });
    expect(secondHand.voiceId).toBeNull();
    expect(secondHand.state.playedGameStart).toBe(true);
  });

  it('maps local action and draw-result events', () => {
    const state = createGameVoiceState();
    expect(
      decide(state, {
        claimTileEvent: {
          playerId: 0,
          reason: DiscardReason.DISCARD_REASON_CHII,
        },
      }).voiceId,
    ).toBe('chii');
    expect(decide(state, { kanEvent: { playerId: 0 } }).voiceId).toBe('kan');
    expect(
      decide(state, {
        agariEvent: { isTsumo: false, agariInfos: [{ playerId: 0 }] },
      }).voiceId,
    ).toBe('ron');
    expect(
      decide(state, {
        ryuukyokuEvent: {
          endGameRyuukyoku: { tenpaiPlayers: [0] },
        },
      }).voiceId,
    ).toBe('tenpai');
    expect(
      decide(state, {
        ryuukyokuEvent: {
          endGameRyuukyoku: { tenpaiPlayers: [1] },
        },
      }).voiceId,
    ).toBe('noten');
  });

  it('plays basic action voices for other players', () => {
    const state = createGameVoiceState();
    expect(
      decide(state, {
        claimTileEvent: {
          playerId: 1,
          reason: DiscardReason.DISCARD_REASON_PON,
        },
      }).voiceId,
    ).toBe('pon');
    expect(decide(state, { kanEvent: { playerId: 1 } }).voiceId).toBe('kan');
    expect(decide(state, { nukiDoraEvent: { playerId: 1 } }).voiceId).toBe(
      'nuki',
    );
    const afterFirstJun = room();
    afterFirstJun.players[0]!.gameState!.jun = 2;
    expect(
      decide(
        state,
        { discardTileEvent: { playerId: 1, isRiichi: true } },
        afterFirstJun,
      ).voiceId,
    ).toBe('riichi');
    expect(
      decide(state, {
        agariEvent: { isTsumo: true, agariInfos: [{ playerId: 1 }] },
      }).voiceId,
    ).toBe('tsumo');
    expect(
      decide(state, {
        ryuukyokuEvent: {
          midGameRyuukyoku: { name: 'kyuushu_kyuuhai' },
        },
      }).voiceId,
    ).toBe('kyuushuKyuuhai');
  });

  it('starts riichi voices with the discard animation', () => {
    const state = createGameVoiceState();
    expect(
      decide(state, {
        discardTileEvent: { playerId: 0, isRiichi: true },
      }).voiceId,
    ).toBe('doubleRiichi');

    const before = room();
    before.players[0]!.gameState!.jun = 2;
    before.players[1]!.gameState!.riichiTileId = 99;
    expect(
      decide(
        state,
        { discardTileEvent: { playerId: 0, isRiichi: true } },
        before,
      ).voiceId,
    ).toBe('okkakeRiichi');
    expect(
      decide(state, { setRiichiEvent: { playerId: 0, wRiichi: false } }, before)
        .voiceId,
    ).toBeNull();
  });

  it('starts daiminkan voice with the claim animation and does not repeat it', () => {
    const state = createGameVoiceState();
    expect(
      decide(state, {
        claimTileEvent: {
          playerId: 1,
          group: { tiles: [{}, {}, {}, {}] },
        },
      }).voiceId,
    ).toBe('kan');
    expect(
      decide(state, {
        kanEvent: {
          playerId: 1,
          kanSource: TileSource.TILE_SOURCE_DAIMINKAN,
        },
      }).voiceId,
    ).toBeNull();
  });

  it('plays the low-wall line only when the count crosses ten', () => {
    const state = createGameVoiceState();
    expect(
      decide(state, { drawTileEvent: { playerId: 1 } }, room(11), room(10))
        .voiceId,
    ).toBe('wallLow');
    expect(
      decide(state, { drawTileEvent: { playerId: 0 } }, room(10), room(9))
        .voiceId,
    ).toBeNull();
  });

  it('plays the dora-discard line on the first dora discard only', () => {
    const state = createGameVoiceState();
    const before = room();
    before.info!.doras = [{ tile: Tile.fromString('1m').toByte() }];
    const event = {
      discardTileEvent: {
        playerId: 0,
        discarded: { tile: Tile.fromString('2m').toByte() },
      },
    };
    const dec = decide(state, event, before);
    expect(dec.voiceId).toBe('discardDora');
    expect(dec.speakerSeat).toBe(0);
    // A second dora discard by the same player this round is silent.
    expect(decide(dec.state, event, before).voiceId).toBeNull();
  });

  it('treats akadora as a dora discard', () => {
    const state = createGameVoiceState();
    const before = room();
    // No dora indicator matches, so only the red-five flag qualifies.
    before.info!.doras = [{ tile: Tile.fromString('9s').toByte() }];
    const event = {
      discardTileEvent: {
        playerId: 0,
        discarded: { tile: Tile.fromString('r5m').toByte() },
      },
    };
    expect(decide(state, event, before).voiceId).toBe('discardDora');
  });

  it('tracks the dora discard per player independently', () => {
    let state = createGameVoiceState();
    const before = room();
    before.info!.doras = [{ tile: Tile.fromString('1m').toByte() }];
    const doraTile = { tile: Tile.fromString('2m').toByte() };

    const first = decide(
      state,
      { discardTileEvent: { playerId: 0, discarded: doraTile } },
      before,
    );
    expect(first.voiceId).toBe('discardDora');
    state = first.state;

    // A different player's first dora discard still fires.
    const second = decide(
      state,
      { discardTileEvent: { playerId: 1, discarded: doraTile } },
      before,
    );
    expect(second.voiceId).toBe('discardDora');
    expect(second.speakerSeat).toBe(1);
  });

  it('plays the repeat-discard line on the third consecutive tile kind', () => {
    let state = createGameVoiceState();
    const event = {
      discardTileEvent: {
        playerId: 0,
        discarded: { tile: Tile.fromString('4p').toByte() },
      },
    };
    let decision = decide(state, event);
    state = decision.state;
    decision = decide(state, event);
    state = decision.state;
    decision = decide(state, event);
    expect(decision.voiceId).toBe('repeatDiscard');
    expect(decision.speakerSeat).toBe(0);
    expect(decide(decision.state, event).voiceId).toBeNull();
  });

  it('plays the opponent-call line after three consecutive claimed discards', () => {
    let state = createGameVoiceState();
    let lastDecision: GameVoiceDecision | null = null;
    for (const tileName of ['1m', '2m', '3m']) {
      const tile = Tile.fromString(tileName).toByte();
      state = decide(state, {
        discardTileEvent: { playerId: 0, discarded: { tile } },
      }).state;
      lastDecision = decide(state, {
        claimTileEvent: {
          playerId: 1,
          tile: { tile, discardInfo: { from: 0 } },
        },
      });
      state = lastDecision.state;
    }
    expect(lastDecision?.voiceId).toBe('opponentCalls');
    expect(lastDecision?.speakerSeat).toBe(0);
  });

  it('plays dora discard, repeat discard and opponent calls for opponents as well', () => {
    let state = createGameVoiceState();
    const before = room();
    before.info!.doras = [{ tile: Tile.fromString('1m').toByte() }];

    // 1. Dora discard by opponent (seat 1)
    const decDora = reduceGameVoice(state, {
      event: {
        discardTileEvent: {
          playerId: 1,
          discarded: { tile: Tile.fromString('2m').toByte() },
        },
      },
      before,
      after: before,
      selfSeat: 0,
    });
    expect(decDora.voiceId).toBe('discardDora');
    expect(decDora.speakerSeat).toBe(1);
    state = decDora.state;

    // 2. Repeat discard by opponent (seat 1)
    const repeatEvent = {
      discardTileEvent: {
        playerId: 1,
        discarded: { tile: Tile.fromString('4p').toByte() },
      },
    };
    let decRepeat = reduceGameVoice(state, {
      event: repeatEvent,
      before,
      after: before,
      selfSeat: 0,
    });
    state = decRepeat.state;
    decRepeat = reduceGameVoice(state, {
      event: repeatEvent,
      before,
      after: before,
      selfSeat: 0,
    });
    state = decRepeat.state;
    decRepeat = reduceGameVoice(state, {
      event: repeatEvent,
      before,
      after: before,
      selfSeat: 0,
    });
    expect(decRepeat.voiceId).toBe('repeatDiscard');
    expect(decRepeat.speakerSeat).toBe(1);
    state = decRepeat.state;

    // 3. Opponent (seat 1) got claimed by seat 0 (local player) 3 times
    let lastClaimDec: GameVoiceDecision | null = null;
    for (const tileName of ['5s', '6s', '7s']) {
      const tile = Tile.fromString(tileName).toByte();
      state = reduceGameVoice(state, {
        event: { discardTileEvent: { playerId: 1, discarded: { tile } } },
        before,
        after: before,
        selfSeat: 0,
      }).state;
      lastClaimDec = reduceGameVoice(state, {
        event: {
          claimTileEvent: {
            playerId: 0,
            tile: { tile, discardInfo: { from: 1 } },
          },
        },
        before,
        after: before,
        selfSeat: 0,
      });
      state = lastClaimDec.state;
    }
    expect(lastClaimDec?.voiceId).toBe('opponentCalls');
    expect(lastClaimDec?.speakerSeat).toBe(1); // Opponent complains about being claimed
  });

  it('requires the highest-value wait to be yakuman', () => {
    expect(highestPointTenpaiIsYakuman([wait(32000, 1), wait(48000, 0)])).toBe(
      false,
    );
    expect(highestPointTenpaiIsYakuman([wait(32000, 0), wait(48000, 1)])).toBe(
      true,
    );

    const after = room(20, [wait(48000, 1)]);
    const decision = decide(
      createGameVoiceState(),
      {
        discardTileEvent: {
          playerId: 0,
          discarded: { tile: Tile.fromString('9s').toByte() },
        },
      },
      room(),
      after,
    );
    expect(decision.voiceId).toBe('bigTenpai');
    expect(decision.state.playedBigTenpai).toBe(true);
  });
});
