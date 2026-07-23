import { describe, it, expect, beforeAll } from 'vitest';
import type { RoomModel, PlayerModel } from '../../domain/model';
import { UserStatus, AiType } from '../../proto';
import { createEmptyTileRegistry } from '../../domain/tileRegistry';
import { Tile, TileSuit } from '../../domain/tile';
import { initI18n, t } from '../i18n';
import {
  buildSeatView,
  orderedSeatViews,
  roundSummary,
  playerStatusLabel,
} from './tableView';

const byte = (n: number, suit: TileSuit, aka = false) =>
  new Tile(n, suit, aka).toByte();

function makePlayer(
  id: number,
  seat: number,
  freeTiles: number[],
): PlayerModel {
  return {
    id,
    nickname: `P${id}`,
    status: UserStatus.USER_STATUS_PLAYING,
    seat,
    aiType: AiType.AI_TYPE_NONE,
    gameState: {
      jun: 0,
      points: 25000,
      riichiTileId: 0,
      isRiichiConfirmed: false,
      furiten: {},
      hand: {
        freeTiles: freeTiles.map((b) => ({ tile: b, traceId: b })),
        called: [],
        discarded: [],
        pendingTile: null,
        nukiDora: [],
      },
      agari: null,
    },
  };
}

function makeRoom(players: PlayerModel[]): RoomModel {
  return {
    id: 4321,
    config: { playerCount: players.length },
    info: {
      round: 0,
      dealer: 0,
      honba: 0,
      riichiStick: 0,
      remainingTiles: 70,
      currentPlayer: 0,
      doras: [{ tile: byte(1, TileSuit.M) }],
      uradoras: [],
    },
    players,
    tileRegistry: createEmptyTileRegistry(),
  };
}

describe('tableView', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('reveals the self hand but conceals opponents as backs', () => {
    const self = makePlayer(1, 0, [byte(1, TileSuit.M), byte(2, TileSuit.M)]);
    const opp = makePlayer(2, 1, [byte(3, TileSuit.P), byte(4, TileSuit.P)]);
    const room = makeRoom([self, opp]);

    const selfView = buildSeatView(room, self, 1, 'ascii', t);
    expect(selfView.hand.map((g) => g.text)).toEqual(['1m', '2m']);
    expect(selfView.isSelf).toBe(true);

    const oppView = buildSeatView(room, opp, 1, 'ascii', t);
    expect(oppView.hand.every((g) => g.isBack)).toBe(true);
    expect(oppView.handCount).toBe(2);
    expect(oppView.isSelf).toBe(false);
  });

  it('marks dealer and current player', () => {
    const self = makePlayer(1, 0, []);
    const opp = makePlayer(2, 1, []);
    const room = makeRoom([self, opp]);
    const view = buildSeatView(room, self, 1, 'ascii', t);
    expect(view.isDealer).toBe(true);
    expect(view.isCurrent).toBe(true);
  });

  it('orders seats so the local player comes first', () => {
    const p0 = makePlayer(10, 0, []);
    const p1 = makePlayer(11, 1, []);
    const p2 = makePlayer(12, 2, []);
    const room = makeRoom([p0, p1, p2]);

    const ordered = orderedSeatViews(room, 11, 'ascii', t);
    expect(ordered.map((v) => v.seat)).toEqual([1, 2, 0]);
    expect(ordered[0]?.isSelf).toBe(true);
  });

  it('summarizes the round', () => {
    const room = makeRoom([makePlayer(1, 0, []), makePlayer(2, 1, [])]);
    expect(roundSummary(room, t)).toContain('East 1');
    expect(roundSummary(room, t)).toContain('70');
  });

  it('renders honba when present', () => {
    const room = makeRoom([makePlayer(1, 0, []), makePlayer(2, 1, [])]);
    room.info!.honba = 2;
    expect(roundSummary(room, t)).toContain('2 honba');
  });

  it('maps user status to labels', () => {
    expect(playerStatusLabel(UserStatus.USER_STATUS_READY, t)).toBe('Ready');
    expect(playerStatusLabel(UserStatus.USER_STATUS_IN_ROOM, t)).toBe(
      'Waiting',
    );
    expect(playerStatusLabel(UserStatus.USER_STATUS_PLAYING, t)).toBe(
      'Playing',
    );
  });

  it('classifies river discards as tedashi vs tsumogiri', () => {
    const self = makePlayer(1, 0, []);
    // Tsumogiri: drawn and discarded on the same turn (jun 3 === jun 3).
    // Tedashi: drawn turn 2, discarded turn 5.
    self.gameState!.hand.discarded = [
      {
        tile: byte(1, TileSuit.M),
        traceId: 1,
        drawnJun: 3,
        discardInfo: { jun: 3 },
      },
      {
        tile: byte(2, TileSuit.M),
        traceId: 2,
        drawnJun: 2,
        discardInfo: { jun: 5 },
      },
    ];
    const room = makeRoom([self, makePlayer(2, 1, [])]);
    const view = buildSeatView(room, self, 1, 'ascii', t);
    expect(view.river.map((r) => r.isTedashi)).toEqual([false, true]);
    expect(view.river.map((r) => r.glyph.text)).toEqual(['1m', '2m']);
  });
});
