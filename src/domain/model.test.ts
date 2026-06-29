import { describe, it, expect } from 'vitest';
import {
  nextPlayerSeat,
  prevPlayerSeat,
  getPlayerBySeat,
  getPlayerById,
  getWindKey,
  type PlayerModel,
} from './model';
import { UserStatus } from '../proto';

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
    },
    {
      id: 102,
      nickname: 'Bob',
      status: UserStatus.USER_STATUS_PLAYING,
      seat: 1,
      gameState: null,
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
