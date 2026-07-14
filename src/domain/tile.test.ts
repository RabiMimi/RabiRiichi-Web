import { describe, it, expect } from 'vitest';
import {
  Tile,
  TileSuit,
  stringToTiles,
  getDoraTargetForIndicator,
  checkIsDora,
  checkDiscardResultsInFuriten,
  isTileUnknown,
} from './tile';

describe('Tile Model', () => {
  describe('Byte Round-trip', () => {
    it('should round-trip normal tiles', () => {
      const suits = [TileSuit.M, TileSuit.P, TileSuit.S, TileSuit.Z];
      for (const suit of suits) {
        const maxRank = suit === TileSuit.Z ? 7 : 9;
        for (let rank = 1; rank <= maxRank; rank++) {
          const tile = new Tile(rank, suit, false);
          const byte = tile.toByte();
          const decoded = Tile.fromByte(byte);
          expect(decoded.num).toBe(rank);
          expect(decoded.suit).toBe(suit);
          expect(decoded.akadora).toBe(false);
        }
      }
    });

    it('should round-trip akadora (red five) tiles', () => {
      const suits = [TileSuit.M, TileSuit.P, TileSuit.S];
      for (const suit of suits) {
        const tile = new Tile(5, suit, true);
        const byte = tile.toByte();
        const decoded = Tile.fromByte(byte);
        expect(decoded.num).toBe(5);
        expect(decoded.suit).toBe(suit);
        expect(decoded.akadora).toBe(true);
      }
    });
  });

  describe('String Parsing and Formatting', () => {
    it('should parse normal tiles from string', () => {
      const t1 = Tile.fromString('1m');
      expect(t1.num).toBe(1);
      expect(t1.suit).toBe(TileSuit.M);
      expect(t1.akadora).toBe(false);
      expect(t1.toString()).toBe('1m');

      const t2 = Tile.fromString('9s');
      expect(t2.num).toBe(9);
      expect(t2.suit).toBe(TileSuit.S);
      expect(t2.akadora).toBe(false);
      expect(t2.toString()).toBe('9s');

      const t3 = Tile.fromString('7z');
      expect(t3.num).toBe(7);
      expect(t3.suit).toBe(TileSuit.Z);
      expect(t3.akadora).toBe(false);
      expect(t3.toString()).toBe('7z');
    });

    it('should parse red fives from string (both 0 and r5 formats)', () => {
      // 0p format
      const t1 = Tile.fromString('0p');
      expect(t1.num).toBe(5);
      expect(t1.suit).toBe(TileSuit.P);
      expect(t1.akadora).toBe(true);
      expect(t1.toString()).toBe('r5p'); // toString outputs r5p

      // r5m format
      const t2 = Tile.fromString('r5m');
      expect(t2.num).toBe(5);
      expect(t2.suit).toBe(TileSuit.M);
      expect(t2.akadora).toBe(true);
      expect(t2.toString()).toBe('r5m');
    });
  });

  describe('Sorting (compareTo)', () => {
    it('should sort by suit first', () => {
      const m1 = Tile.fromString('1m');
      const p1 = Tile.fromString('1p');
      const s1 = Tile.fromString('1s');
      const z1 = Tile.fromString('1z');

      expect(m1.compareTo(p1)).toBeLessThan(0);
      expect(p1.compareTo(s1)).toBeLessThan(0);
      expect(s1.compareTo(z1)).toBeLessThan(0);
      expect(z1.compareTo(m1)).toBeGreaterThan(0);
    });

    it('should sort by rank within same suit', () => {
      const m1 = Tile.fromString('1m');
      const m2 = Tile.fromString('2m');
      const m9 = Tile.fromString('9m');

      expect(m1.compareTo(m2)).toBeLessThan(0);
      expect(m2.compareTo(m9)).toBeLessThan(0);
      expect(m9.compareTo(m1)).toBeGreaterThan(0);
    });

    it('should sort red five after normal five of same suit', () => {
      const m5 = Tile.fromString('5m');
      const rm5 = Tile.fromString('r5m');

      expect(m5.compareTo(rm5)).toBeLessThan(0);
      expect(rm5.compareTo(m5)).toBeGreaterThan(0);
    });

    it('should sort a list of tiles correctly', () => {
      const tiles = [
        Tile.fromString('9s'),
        Tile.fromString('1z'),
        Tile.fromString('r5m'),
        Tile.fromString('5m'),
        Tile.fromString('1m'),
        Tile.fromString('2p'),
      ];

      tiles.sort((a, b) => a.compareTo(b));

      const sortedStrings = tiles.map((t) => t.toString());
      expect(sortedStrings).toEqual(['1m', '5m', 'r5m', '2p', '9s', '1z']);
    });
  });

  describe('stringToTiles Helper', () => {
    it('should parse group strings', () => {
      const tiles = stringToTiles('123m05p789s11122z');
      expect(tiles.map((t) => t.toString())).toEqual([
        '1m',
        '2m',
        '3m',
        'r5p', // 0p -> r5p
        '5p',
        '7s',
        '8s',
        '9s',
        '1z',
        '1z',
        '1z',
        '2z',
        '2z',
      ]);
    });

    it('should throw error on invalid strings', () => {
      expect(() => stringToTiles('123')).toThrow(
        'Some tile suits not provided',
      );
      expect(() => stringToTiles('123x')).toThrow(
        'Some tile suits not provided',
      );
      expect(() => stringToTiles('123r')).toThrow(
        'Some tile suits not provided',
      );
      expect(() => stringToTiles('123a')).toThrow('Invalid tile suit');
    });
  });

  describe('Dora Calculation & Checking', () => {
    it('should calculate correct dora target from indicator', () => {
      // Numbered suits
      expect(getDoraTargetForIndicator(Tile.fromString('1m'))).toEqual({
        num: 2,
        suit: TileSuit.M,
      });
      expect(getDoraTargetForIndicator(Tile.fromString('9p'))).toEqual({
        num: 1,
        suit: TileSuit.P,
      });
      expect(getDoraTargetForIndicator(Tile.fromString('5s'))).toEqual({
        num: 6,
        suit: TileSuit.S,
      });
      expect(getDoraTargetForIndicator(Tile.fromString('r5s'))).toEqual({
        num: 6,
        suit: TileSuit.S,
      });

      // Winds (1z -> 2z -> 3z -> 4z -> 1z)
      expect(getDoraTargetForIndicator(Tile.fromString('1z'))).toEqual({
        num: 2,
        suit: TileSuit.Z,
      }); // E -> S
      expect(getDoraTargetForIndicator(Tile.fromString('4z'))).toEqual({
        num: 1,
        suit: TileSuit.Z,
      }); // N -> E

      // Dragons (5z -> 6z -> 7z -> 5z)
      expect(getDoraTargetForIndicator(Tile.fromString('5z'))).toEqual({
        num: 6,
        suit: TileSuit.Z,
      }); // Haku -> Hatsu
      expect(getDoraTargetForIndicator(Tile.fromString('7z'))).toEqual({
        num: 5,
        suit: TileSuit.Z,
      }); // Chun -> Haku
    });

    it('should identify dora tiles correctly', () => {
      const indicators = [Tile.fromString('1m'), Tile.fromString('5z')];

      // Match target (2m is dora from 1m indicator)
      expect(checkIsDora(Tile.fromString('2m'), indicators)).toBe(true);

      // Match target (6z is hatsu, dora from 5z haku indicator)
      expect(checkIsDora(Tile.fromString('6z'), indicators)).toBe(true);

      // Akadora is always dora
      expect(checkIsDora(Tile.fromString('r5s'), indicators)).toBe(true);
      expect(checkIsDora(Tile.fromString('r5m'), indicators)).toBe(true);

      // Normal non-matching tile is not dora
      expect(checkIsDora(Tile.fromString('1m'), indicators)).toBe(false);
      expect(checkIsDora(Tile.fromString('5m'), indicators)).toBe(false);
      expect(checkIsDora(Tile.fromString('7z'), indicators)).toBe(false);
    });
  });

  describe('Discard Results In Furiten Calculation', () => {
    const toByte = (str: string) => Tile.fromString(str).toByte();

    it('should result in furiten if already permanently furiten', () => {
      expect(
        checkDiscardResultsInFuriten(
          toByte('1m'),
          [toByte('2m')],
          [toByte('3m')],
          true, // isAlreadyFuriten
        ),
      ).toBe(true);
    });

    it('should result in furiten if discarded tile is one of the winning waits', () => {
      // Discarding 2m (the wait tile itself)
      expect(
        checkDiscardResultsInFuriten(
          toByte('2m'),
          [toByte('2m'), toByte('5m')],
          [toByte('9m')],
          false,
        ),
      ).toBe(true);

      // Discarding r5m (akadora 5m) while waiting on 5m
      expect(
        checkDiscardResultsInFuriten(
          toByte('r5m'),
          [toByte('5m')],
          [toByte('9m')],
          false,
        ),
      ).toBe(true);

      // Discarding 5m while waiting on r5m (highly unusual but theoretical wait)
      expect(
        checkDiscardResultsInFuriten(
          toByte('5m'),
          [toByte('r5m')],
          [toByte('9m')],
          false,
        ),
      ).toBe(true);
    });

    it('should result in furiten if any winning wait has already been discarded', () => {
      // Winning wait 3m is in discards
      expect(
        checkDiscardResultsInFuriten(
          toByte('1m'), // discard 1m
          [toByte('3m'), toByte('6m')], // waiting on 3m/6m
          [toByte('3m'), toByte('8s')], // discards has 3m
          false,
        ),
      ).toBe(true);

      // Winning wait 5s is in discards as r5s
      expect(
        checkDiscardResultsInFuriten(
          toByte('1m'),
          [toByte('5s')],
          [toByte('r5s')],
          false,
        ),
      ).toBe(true);
    });

    it('should not result in furiten if neither the discarded tile nor discards match any waits', () => {
      expect(
        checkDiscardResultsInFuriten(
          toByte('1m'),
          [toByte('2m'), toByte('5m')],
          [toByte('9m'), toByte('8s')],
          false,
        ),
      ).toBe(false);
    });
  });

  describe('isTileUnknown', () => {
    it('should identify null or undefined as unknown', () => {
      expect(isTileUnknown(null)).toBe(true);
      expect(isTileUnknown(undefined)).toBe(true);
    });

    it('should identify numeric 0 as unknown', () => {
      expect(isTileUnknown(0)).toBe(true);
      expect(isTileUnknown(0x00)).toBe(true);
      expect(isTileUnknown(21)).toBe(false); // some valid tile byte
    });

    it('should identify special strings like back, blank, 0x, and anything with x as unknown', () => {
      expect(isTileUnknown('back')).toBe(true);
      expect(isTileUnknown('blank')).toBe(true);
      expect(isTileUnknown('0x')).toBe(true);
      expect(isTileUnknown('1x')).toBe(true);
      expect(isTileUnknown('1m')).toBe(false);
      expect(isTileUnknown('r5s')).toBe(false);
    });

    it('should identify Tile objects with Invalid suit as unknown', () => {
      expect(isTileUnknown(new Tile(0, TileSuit.Invalid))).toBe(true);
      expect(isTileUnknown(new Tile(5, TileSuit.Invalid))).toBe(true);
      expect(isTileUnknown(new Tile(1, TileSuit.M))).toBe(false);
      expect(isTileUnknown(Tile.Back)).toBe(true);
    });
  });
});
