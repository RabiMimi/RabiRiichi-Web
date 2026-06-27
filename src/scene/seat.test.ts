import { describe, it, expect } from 'vitest';
import { getScreenPosition, getSeatRotation } from './seat';

describe('seat rotation math', () => {
  describe('getScreenPosition', () => {
    describe('2-player game', () => {
      it('should map local player to position 0', () => {
        expect(getScreenPosition(0, 0, 2)).toBe(0);
        expect(getScreenPosition(1, 1, 2)).toBe(0);
      });

      it('should map opponent player to position 2', () => {
        expect(getScreenPosition(1, 0, 2)).toBe(2);
        expect(getScreenPosition(0, 1, 2)).toBe(2);
      });
    });

    describe('4-player game', () => {
      it('should map players correctly when local player is seat 0 (East)', () => {
        expect(getScreenPosition(0, 0, 4)).toBe(0); // Self
        expect(getScreenPosition(1, 0, 4)).toBe(1); // Right
        expect(getScreenPosition(2, 0, 4)).toBe(2); // Top
        expect(getScreenPosition(3, 0, 4)).toBe(3); // Left
      });

      it('should map players correctly when local player is seat 1 (South)', () => {
        expect(getScreenPosition(1, 1, 4)).toBe(0); // Self
        expect(getScreenPosition(2, 1, 4)).toBe(1); // Right
        expect(getScreenPosition(3, 1, 4)).toBe(2); // Top
        expect(getScreenPosition(0, 1, 4)).toBe(3); // Left
      });

      it('should map players correctly when local player is seat 2 (West)', () => {
        expect(getScreenPosition(2, 2, 4)).toBe(0); // Self
        expect(getScreenPosition(3, 2, 4)).toBe(1); // Right
        expect(getScreenPosition(0, 2, 4)).toBe(2); // Top
        expect(getScreenPosition(1, 2, 4)).toBe(3); // Left
      });

      it('should map players correctly when local player is seat 3 (North)', () => {
        expect(getScreenPosition(3, 3, 4)).toBe(0); // Self
        expect(getScreenPosition(0, 3, 4)).toBe(1); // Right
        expect(getScreenPosition(1, 3, 4)).toBe(2); // Top
        expect(getScreenPosition(2, 3, 4)).toBe(3); // Left
      });
    });
  });

  describe('getSeatRotation', () => {
    it('should return correct rotation angles in radians', () => {
      expect(getSeatRotation(0)).toBe(0);
      expect(getSeatRotation(1)).toBe(Math.PI / 2);
      expect(getSeatRotation(2)).toBe(Math.PI);
      expect(getSeatRotation(3)).toBe((3 * Math.PI) / 2);
    });
  });
});
