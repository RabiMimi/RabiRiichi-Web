import { describe, it, expect } from 'vitest';
import {
  nextPlayerSeat,
  prevPlayerSeat,
  getPlayerBySeat,
  getPlayerById,
  getWindKey,
  isTsumoTile,
  shouldRevealHand,
  type PlayerModel,
  type PlayerAgariState,
} from './model';
import { UserStatus, AiType } from '../proto';

describe('Model seat math', () => {
  describe('2-player config', () => {
    const playerCount = 2;

    it('should calculate next seat correctly', () => {
      expect(nextPlayerSeat(0, playerCount)).toBe(1);
      expect(nextPlayerSeat(1, playerCount)).toBe(0);
    });

    it('should calculate prev seat correctly', () => {
      expect(prevPlayerSeat(0, playerCount)).toBe(1);
      expect(prevPlayerSeat(1, playerCount)).toBe(0);
    });
  });

  describe('4-player config', () => {
    const playerCount = 4;

    it('should calculate next seat correctly', () => {
      expect(nextPlayerSeat(0, playerCount)).toBe(1);
      expect(nextPlayerSeat(1, playerCount)).toBe(2);
      expect(nextPlayerSeat(2, playerCount)).toBe(3);
      expect(nextPlayerSeat(3, playerCount)).toBe(0);
    });

    it('should calculate prev seat correctly', () => {
      expect(prevPlayerSeat(0, playerCount)).toBe(3);
      expect(prevPlayerSeat(1, playerCount)).toBe(0);
      expect(prevPlayerSeat(2, playerCount)).toBe(1);
      expect(prevPlayerSeat(3, playerCount)).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero player count gracefully', () => {
      expect(nextPlayerSeat(0, 0)).toBe(0);
      expect(prevPlayerSeat(0, 0)).toBe(0);
    });
  });
});

describe('Model lookups', () => {
  const mockPlayers: PlayerModel[] = [
    {
      id: 101,
      nickname: 'Alice',
      status: UserStatus.USER_STATUS_PLAYING,
      seat: 0,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    },
    {
      id: 102,
      nickname: 'Bob',
      status: UserStatus.USER_STATUS_PLAYING,
      seat: 1,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    },
  ];

  it('should find player by seat', () => {
    expect(getPlayerBySeat(mockPlayers, 0)).toBe(mockPlayers[0]);
    expect(getPlayerBySeat(mockPlayers, 1)).toBe(mockPlayers[1]);
    expect(getPlayerBySeat(mockPlayers, 2)).toBeUndefined();
  });

  it('should find player by id', () => {
    expect(getPlayerById(mockPlayers, 101)).toBe(mockPlayers[0]);
    expect(getPlayerById(mockPlayers, 102)).toBe(mockPlayers[1]);
    expect(getPlayerById(mockPlayers, 999)).toBeUndefined();
  });
});

describe('Model wind conversion', () => {
  it('should return correct wind keys', () => {
    expect(getWindKey(0)).toBe('east');
    expect(getWindKey(1)).toBe('south');
    expect(getWindKey(2)).toBe('west');
    expect(getWindKey(3)).toBe('north');
    expect(getWindKey(4)).toBe('east');
    expect(getWindKey(7)).toBe('north');
  });
});

describe('isTsumoTile', () => {
  it('treats a tile without discardInfo as tsumo', () => {
    expect(isTsumoTile({ traceId: 1, tile: 17 })).toBe(true);
  });

  it('treats a tile with discardInfo as ron (not tsumo)', () => {
    expect(
      isTsumoTile({
        traceId: 1,
        tile: 17,
        discardInfo: { from: 2, reason: 1, time: 5 },
      }),
    ).toBe(false);
  });

  it('treats a discardInfo with from=0 as ron (from is never null on the wire)', () => {
    expect(
      isTsumoTile({
        traceId: 1,
        tile: 17,
        discardInfo: { from: 0, reason: 1, time: 5 },
      }),
    ).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isTsumoTile(null)).toBe(false);
    expect(isTsumoTile(undefined)).toBe(false);
  });
});

describe('shouldRevealHand', () => {
  const winner: PlayerAgariState = { gainPoints: 8000, losePoints: 0 };
  const tenpai: PlayerAgariState = {
    gainPoints: 1000,
    losePoints: 0,
    isTenpai: true,
  };
  const scoredOnly: PlayerAgariState = {
    gainPoints: 0,
    losePoints: 0,
    scores: { items: [] },
  };
  // A noten player at a draw: reducer still assigns an (empty) agari state.
  const noten: PlayerAgariState = { gainPoints: 0, losePoints: 3000 };

  it('reveals a winner', () => {
    expect(shouldRevealHand(winner, false)).toBe(true);
  });

  it('reveals a tenpai player at a draw', () => {
    expect(shouldRevealHand(tenpai, false)).toBe(true);
  });

  it('reveals a player with a score breakdown', () => {
    expect(shouldRevealHand(scoredOnly, false)).toBe(true);
  });

  it('does NOT reveal a noten player at a draw (even though agari is set)', () => {
    expect(shouldRevealHand(noten, false)).toBe(false);
  });

  it('never reveals the local player', () => {
    expect(shouldRevealHand(winner, true)).toBe(false);
  });

  it('does not reveal when there is no agari', () => {
    expect(shouldRevealHand(null, false)).toBe(false);
    expect(shouldRevealHand(undefined, false)).toBe(false);
  });
});
