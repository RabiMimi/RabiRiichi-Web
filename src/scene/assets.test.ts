import { describe, it, expect } from 'vitest';
import { getTileTexturePath } from './assets';
import { Tile } from '../domain/tile';

describe('scene assets registry', () => {
  it('should map valid tile strings to correct texture paths', () => {
    expect(getTileTexturePath('1m')).toBe('/assets/hand_tiles/1m.jpg');
    expect(getTileTexturePath('9s')).toBe('/assets/hand_tiles/9s.jpg');
    expect(getTileTexturePath('r5p')).toBe('/assets/hand_tiles/r5p.jpg');
    expect(getTileTexturePath('7z')).toBe('/assets/hand_tiles/7z.jpg');
  });

  it('should map Tile objects to correct texture paths', () => {
    expect(getTileTexturePath(Tile.fromString('3m'))).toBe(
      '/assets/hand_tiles/3m.jpg',
    );
    expect(getTileTexturePath(Tile.fromString('r5s'))).toBe(
      '/assets/hand_tiles/r5s.jpg',
    );
    expect(getTileTexturePath(Tile.fromString('5z'))).toBe(
      '/assets/hand_tiles/5z.jpg',
    );
  });

  it('should fallback to blank.jpg for invalid or unknown tiles', () => {
    expect(getTileTexturePath(null)).toBe('/assets/hand_tiles/blank.jpg');
    expect(getTileTexturePath('back')).toBe('/assets/hand_tiles/blank.jpg');
    expect(getTileTexturePath('0x')).toBe('/assets/hand_tiles/blank.jpg');
    expect(getTileTexturePath('9z')).toBe('/assets/hand_tiles/blank.jpg'); // invalid dragon
    expect(getTileTexturePath('10m')).toBe('/assets/hand_tiles/blank.jpg'); // invalid rank
  });

  it('should map front and blank special textures correctly', () => {
    expect(getTileTexturePath('front')).toBe('/assets/hand_tiles/front.jpg');
    expect(getTileTexturePath('blank')).toBe('/assets/hand_tiles/blank.jpg');
  });
});
