/**
 * Pure tile-to-text rendering for the terminal.
 *
 * Two modes:
 * - `unicode`: the dedicated Mahjong Tiles block (U+1F000–U+1F02B). Compact and
 *   pretty, but ambiguous-width in many terminals and with no distinct glyph
 *   for red fives (we append a marker + color instead).
 * - `ascii`: fixed-width two/three-char labels (`1m`, `5p`, `Ea`, `Wh`, …).
 *   Predictable alignment everywhere; the safe default for readability.
 *
 * Everything here is a pure function of the tile so it is trivially testable and
 * carries no Ink/React dependency. Color is expressed as an Ink color name and
 * applied by the rendering components.
 */
import { Tile, TileSuit } from '../../domain/tile';

export type TileMode = 'unicode' | 'ascii';

/** Ink color names used to distinguish suits and highlight red fives. */
export type TileColor = 'red' | 'blue' | 'green' | 'white' | 'gray' | 'yellow';

/** A fully-resolved tile presentation: the glyph/label and its foreground. */
export interface TileGlyph {
  text: string;
  color: TileColor;
  /** True for face-down / unknown tiles (rendered as a back). */
  isBack: boolean;
}

// Honor-tile short labels for ASCII mode. Z-suit num: 1..4 winds, 5..7 dragons.
// Winds: East, South, West, North. Dragons: White(haku), Green(hatsu), Red(chun).
const HONOR_ASCII: Record<number, string> = {
  1: 'Ea',
  2: 'So',
  3: 'We',
  4: 'No',
  5: 'Wh',
  6: 'Gr',
  7: 'Rd',
};

// Unicode Mahjong Tiles block code points.
// Winds 1..4 (E,S,W,N) => U+1F000..U+1F003.
const HONOR_WIND_UNICODE = [0x1f000, 0x1f001, 0x1f002, 0x1f003];
// Dragons: white=U+1F006, green=U+1F005, red=U+1F004 (num 5,6,7 respectively).
const HONOR_DRAGON_UNICODE: Record<number, number> = {
  5: 0x1f006,
  6: 0x1f005,
  7: 0x1f004,
};
// Suited runs (num 1..9). Characters(m) 1F007..1F00F, Bamboo(s) 1F010..1F018,
// Circles(p) 1F019..1F021.
const SUITED_UNICODE_BASE: Partial<Record<TileSuit, number>> = {
  [TileSuit.M]: 0x1f007,
  [TileSuit.S]: 0x1f010,
  [TileSuit.P]: 0x1f019,
};
const TILE_BACK_UNICODE = 0x1f02b;

const SUIT_LETTER: Partial<Record<TileSuit, string>> = {
  [TileSuit.M]: 'm',
  [TileSuit.P]: 'p',
  [TileSuit.S]: 's',
};

function isUnknown(tile: Tile): boolean {
  return tile.suit === TileSuit.Invalid || tile.num <= 0;
}

/** The Ink color for a tile's suit (red fives always render red). */
export function colorForTile(tile: Tile): TileColor {
  if (isUnknown(tile)) return 'gray';
  if (tile.akadora) return 'red';
  switch (tile.suit) {
    case TileSuit.M:
      return 'yellow';
    case TileSuit.P:
      return 'blue';
    case TileSuit.S:
      return 'green';
    case TileSuit.Z:
      return 'white';
    case TileSuit.Invalid:
      return 'gray';
    default:
      return 'gray';
  }
}

function asciiLabel(tile: Tile): string {
  if (tile.suit === TileSuit.Z) {
    return HONOR_ASCII[tile.num] ?? '??';
  }
  const letter = SUIT_LETTER[tile.suit];
  if (!letter) return '??';
  // Red five shows a lowercase leading marker so it reads even without color.
  return `${tile.akadora ? '0' : String(tile.num)}${letter}`;
}

function unicodeChar(tile: Tile): string {
  if (tile.suit === TileSuit.Z) {
    const wind = HONOR_WIND_UNICODE[tile.num - 1];
    if (tile.num >= 1 && tile.num <= 4 && wind !== undefined) {
      return String.fromCodePoint(wind);
    }
    const dragon = HONOR_DRAGON_UNICODE[tile.num];
    return dragon ? String.fromCodePoint(dragon) : '?';
  }
  const base = SUITED_UNICODE_BASE[tile.suit];
  if (base === undefined || tile.num < 1 || tile.num > 9) return '?';
  return String.fromCodePoint(base + (tile.num - 1));
}

/**
 * Renders a tile as a {@link TileGlyph} for the given mode. Unknown/face-down
 * tiles render as a back. In unicode mode, red fives get a trailing `*` marker
 * (the block has no distinct red-five code point) in addition to red color.
 */
export function glyphForTile(tile: Tile, mode: TileMode): TileGlyph {
  if (isUnknown(tile)) {
    return {
      text: mode === 'unicode' ? String.fromCodePoint(TILE_BACK_UNICODE) : '##',
      color: 'gray',
      isBack: true,
    };
  }
  const color = colorForTile(tile);
  if (mode === 'ascii') {
    return { text: asciiLabel(tile), color, isBack: false };
  }
  const char = unicodeChar(tile);
  return {
    text: tile.akadora ? `${char}*` : char,
    color,
    isBack: false,
  };
}

/** Convenience: render directly from a packed tile byte. */
export function glyphForByte(byte: number, mode: TileMode): TileGlyph {
  return glyphForTile(Tile.fromByte(byte), mode);
}

/** A sample hand used by the startup screen to let the user judge legibility. */
export function sampleTileBytes(): number[] {
  // 1m 5m 9m 1p r5p 9p 1s 5s 9s E S W N  (r5p = red five of circles)
  return [
    new Tile(1, TileSuit.M).toByte(),
    new Tile(5, TileSuit.M).toByte(),
    new Tile(9, TileSuit.M).toByte(),
    new Tile(1, TileSuit.P).toByte(),
    new Tile(5, TileSuit.P, true).toByte(),
    new Tile(9, TileSuit.P).toByte(),
    new Tile(1, TileSuit.S).toByte(),
    new Tile(5, TileSuit.S).toByte(),
    new Tile(9, TileSuit.S).toByte(),
    new Tile(1, TileSuit.Z).toByte(),
    new Tile(2, TileSuit.Z).toByte(),
    new Tile(3, TileSuit.Z).toByte(),
    new Tile(4, TileSuit.Z).toByte(),
  ];
}
