import { describe, it, expect } from 'vitest';
import type { RoomModel, PlayerModel } from '../../domain/model';
import type { MappedInquiry } from '../../domain/inquiry';
import { UserStatus, AiType } from '../../proto';
import { createEmptyTileRegistry } from '../../domain/tileRegistry';
import { shouldShowResult, hasNextRound, buildResultView } from './resultView';

function player(
  id: number,
  opts: Partial<PlayerModel['gameState']> = {},
): PlayerModel {
  return {
    id,
    nickname: `P${id}`,
    status: UserStatus.USER_STATUS_PLAYING,
    seat: id,
    aiType: AiType.AI_TYPE_NONE,
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
      ...opts,
    },
  };
}

function room(players: PlayerModel[]): RoomModel {
  return {
    id: 1,
    config: { playerCount: players.length },
    info: {
      round: 0,
      dealer: 0,
      honba: 0,
      riichiStick: 0,
      remainingTiles: 0,
      currentPlayer: 0,
      doras: [],
      uradoras: [],
    },
    players,
    tileRegistry: createEmptyTileRegistry(),
  };
}

const nextRoundInquiry: MappedInquiry = {
  buttons: [{ type: 'next-round', label: '确定', actionIndex: 0 }],
};

describe('hasNextRound', () => {
  it('detects a next-round button', () => {
    expect(hasNextRound(nextRoundInquiry)).toBe(true);
    expect(hasNextRound({ buttons: [] })).toBe(false);
    expect(hasNextRound(undefined)).toBe(false);
  });
});

describe('shouldShowResult', () => {
  it('shows when a player has an agari result', () => {
    const p = player(0, {
      agari: { gainPoints: 8000, losePoints: 0, isTenpai: true, scores: {} },
    });
    expect(shouldShowResult(room([p, player(1)]), undefined, false)).toBe(true);
  });

  it('shows when a next-round confirm is pending', () => {
    expect(
      shouldShowResult(room([player(0), player(1)]), nextRoundInquiry, false),
    ).toBe(true);
  });

  it('shows when waiting for proceed', () => {
    expect(shouldShowResult(room([player(0)]), undefined, true)).toBe(true);
  });

  it('does not show during normal play', () => {
    expect(
      shouldShowResult(room([player(0), player(1)]), undefined, false),
    ).toBe(false);
  });
});

describe('buildResultView', () => {
  it('computes point deltas and classifies agari vs draw', () => {
    const winner = player(0, {
      points: 33000,
      agari: { gainPoints: 8000, losePoints: 0, scores: {} },
    });
    const loser = player(1, {
      points: 17000,
      agari: { gainPoints: 0, losePoints: 8000 },
    });
    const view = buildResultView(room([winner, loser]), (p) => p.nickname);
    expect(view.kind).toBe('agari');
    expect(view.rows).toEqual([
      { id: 0, name: 'P0', delta: 8000, points: 33000 },
      { id: 1, name: 'P1', delta: -8000, points: 17000 },
    ]);
  });

  it('classifies a draw when nobody has scores', () => {
    const view = buildResultView(
      room([
        player(0, { agari: { gainPoints: 0, losePoints: 0, isTenpai: true } }),
      ]),
      (p) => p.nickname,
    );
    expect(view.kind).toBe('draw');
  });
});
