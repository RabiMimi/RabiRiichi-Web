import { describe, it, expect } from 'vitest';
import { Tile, TileSuit } from '../../domain/tile';
import {
  glyphForTile,
  glyphForByte,
  colorForTile,
  sampleTileBytes,
} from './tileGlyph';

const M = (n: number, aka = false) => new Tile(n, TileSuit.M, aka);
const P = (n: number, aka = false) => new Tile(n, TileSuit.P, aka);
const S = (n: number, aka = false) => new Tile(n, TileSuit.S, aka);
const Z = (n: number) => new Tile(n, TileSuit.Z);

describe('glyphForTile - ascii mode', () => {
  it('renders suited tiles as <num><suit>', () => {
    expect(glyphForTile(M(1), 'ascii').text).toBe('1m');
    expect(glyphForTile(P(9), 'ascii').text).toBe('9p');
    expect(glyphForTile(S(5), 'ascii').text).toBe('5s');
  });

  it('renders red fives with a leading 0 marker', () => {
    expect(glyphForTile(P(5, true), 'ascii').text).toBe('0p');
    expect(glyphForTile(M(5, true), 'ascii').text).toBe('0m');
  });

  it('renders honors with two-letter labels', () => {
    expect(glyphForTile(Z(1), 'ascii').text).toBe('Ea');
    expect(glyphForTile(Z(2), 'ascii').text).toBe('So');
    expect(glyphForTile(Z(3), 'ascii').text).toBe('We');
    expect(glyphForTile(Z(4), 'ascii').text).toBe('No');
    expect(glyphForTile(Z(5), 'ascii').text).toBe('Wh');
    expect(glyphForTile(Z(6), 'ascii').text).toBe('Gr');
    expect(glyphForTile(Z(7), 'ascii').text).toBe('Rd');
  });

  it('renders unknown/back tiles as ##', () => {
    expect(glyphForTile(Tile.Back, 'ascii')).toEqual({
      text: '##',
      color: 'gray',
      isBack: true,
    });
  });
});

describe('glyphForTile - unicode mode', () => {
  it('maps man/pin/sou to the correct Mahjong block code points', () => {
    // 1m = U+1F007, 9m = U+1F00F
    expect(glyphForTile(M(1), 'unicode').text).toBe('\u{1F007}');
    expect(glyphForTile(M(9), 'unicode').text).toBe('\u{1F00F}');
    // 1s = U+1F010, 9s = U+1F018
    expect(glyphForTile(S(1), 'unicode').text).toBe('\u{1F010}');
    expect(glyphForTile(S(9), 'unicode').text).toBe('\u{1F018}');
    // 1p = U+1F019, 9p = U+1F021
    expect(glyphForTile(P(1), 'unicode').text).toBe('\u{1F019}');
    expect(glyphForTile(P(9), 'unicode').text).toBe('\u{1F021}');
  });

  it('maps winds and dragons to the correct code points', () => {
    expect(glyphForTile(Z(1), 'unicode').text).toBe('\u{1F000}'); // East
    expect(glyphForTile(Z(4), 'unicode').text).toBe('\u{1F003}'); // North
    expect(glyphForTile(Z(5), 'unicode').text).toBe('\u{1F006}'); // White
    expect(glyphForTile(Z(6), 'unicode').text).toBe('\u{1F005}'); // Green
    expect(glyphForTile(Z(7), 'unicode').text).toBe('\u{1F004}'); // Red
  });

  it('appends a marker to red fives (no distinct code point exists)', () => {
    expect(glyphForTile(P(5, true), 'unicode').text).toBe('\u{1F01D}*');
  });

  it('renders unknown/back tiles as the back glyph', () => {
    expect(glyphForTile(Tile.Back, 'unicode').text).toBe('\u{1F02B}');
  });
});

describe('colorForTile', () => {
  it('assigns a distinct color per suit', () => {
    expect(colorForTile(M(1))).toBe('yellow');
    expect(colorForTile(P(1))).toBe('blue');
    expect(colorForTile(S(1))).toBe('green');
    expect(colorForTile(Z(1))).toBe('white');
  });

  it('always renders red fives in red', () => {
    expect(colorForTile(P(5, true))).toBe('red');
    expect(colorForTile(M(5, true))).toBe('red');
  });

  it('renders unknown tiles gray', () => {
    expect(colorForTile(Tile.Back)).toBe('gray');
  });
});

describe('glyphForByte', () => {
  it('decodes a packed byte then renders it', () => {
    const g = glyphForByte(P(5, true).toByte(), 'ascii');
    expect(g.text).toBe('0p');
    expect(g.color).toBe('red');
  });
});

describe('sampleTileBytes', () => {
  it('provides a legible 13-tile sample including a red five', () => {
    const bytes = sampleTileBytes();
    expect(bytes).toHaveLength(13);
    const labels = bytes.map((b) => glyphForByte(b, 'ascii').text);
    expect(labels).toEqual([
      '1m',
      '5m',
      '9m',
      '1p',
      '0p',
      '9p',
      '1s',
      '5s',
      '9s',
      'Ea',
      'So',
      'We',
      'No',
    ]);
  });
});
