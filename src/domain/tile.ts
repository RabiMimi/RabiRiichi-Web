export const TileSuit = {
  Invalid: 0,
  M: 1,
  P: 2,
  S: 3,
  Z: 4,
} as const;

export type TileSuit = (typeof TileSuit)[keyof typeof TileSuit];

export function toTileSuit(c: string): TileSuit {
  switch (c.toLowerCase()) {
    case 'm':
      return TileSuit.M;
    case 'p':
      return TileSuit.P;
    case 's':
      return TileSuit.S;
    case 'z':
      return TileSuit.Z;
    default:
      return TileSuit.Invalid;
  }
}

export function tileSuitToString(suit: TileSuit): string {
  switch (suit) {
    case TileSuit.Invalid:
      return 'x';
    case TileSuit.M:
      return 'm';
    case TileSuit.P:
      return 'p';
    case TileSuit.S:
      return 's';
    case TileSuit.Z:
      return 'z';
  }
}

export class Tile {
  public static readonly Back = new Tile(0, TileSuit.Invalid);

  public num: number;
  public suit: TileSuit;
  public akadora: boolean;

  public constructor(num: number, suit: TileSuit, akadora = false) {
    this.num = num;
    this.suit = suit;
    this.akadora = akadora;
  }

  public static fromString(str: string): Tile {
    let akadora = false;
    if (str.startsWith('r')) {
      str = str.substring(1);
      akadora = true;
    } else if (str.startsWith('0')) {
      str = '5' + str.substring(1);
      akadora = true;
    }
    const firstChar = str[0];
    const num =
      firstChar && firstChar >= '0' && firstChar <= '9'
        ? parseInt(firstChar, 10)
        : 0;
    const suit = toTileSuit(str[1] ?? '');
    return new Tile(num, suit, akadora);
  }

  public static fromByte(byte: number): Tile {
    const group = (byte >> 4) & 0x07;
    const suit = (Object.values(TileSuit) as readonly number[]).includes(group)
      ? (group as TileSuit)
      : TileSuit.Invalid;
    return new Tile(byte & 0x0f, suit, (byte & 0x80) !== 0);
  }

  public toString(): string {
    // Red fives serialize with an `r` prefix (e.g. `r5m`); `fromString` also
    // accepts the alternate `0m` spelling.
    return `${this.akadora ? 'r' : ''}${this.num}${tileSuitToString(this.suit)}`;
  }

  public toByte(): number {
    return (this.akadora ? 0x80 : 0x00) | (this.suit << 4) | this.num;
  }

  public compareTo(other: Tile): number {
    if (this.suit !== other.suit) {
      return this.suit - other.suit;
    }
    if (this.num !== other.num) {
      return this.num - other.num;
    }
    return (this.akadora ? 1 : 0) - (other.akadora ? 1 : 0);
  }
}

export function stringToTiles(str: string): Tile[] {
  let isDora = false;
  let num: number;
  const tiles: Tile[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if ((c && c >= '0' && c <= '9') || c === 'x') {
      if (c === '0') {
        num = 5;
        isDora = true;
      } else if (c === 'x') {
        num = -1;
      } else {
        num = parseInt(c, 10);
      }
      tiles.push(new Tile(num, TileSuit.Invalid, isDora));
      isDora = false;
      continue;
    }
    if (isDora) {
      throw new Error(`Invalid dora symbol in ${str} at ${i}`);
    }
    if (c === 'r') {
      isDora = true;
      continue;
    }
    const suit = toTileSuit(c ?? '');
    if (suit === TileSuit.Invalid) {
      throw new Error(`Invalid tile suit in ${str} at ${i}`);
    }
    for (let j = tiles.length - 1; j >= 0; j--) {
      const tile = tiles[j];
      if (!tile) {
        continue;
      }
      if (tile.suit !== TileSuit.Invalid) {
        break;
      }
      tile.suit = suit;
    }
  }
  if (tiles.some((t) => t.suit === TileSuit.Invalid)) {
    throw new Error(`Some tile suits not provided in ${str}`);
  }
  return tiles;
}

/**
 * Calculates the winning Dora target tile parameters based on a Dora indicator.
 */
export function getDoraTargetForIndicator(indicator: Tile): {
  num: number;
  suit: TileSuit;
} {
  const suit = indicator.suit;
  let num = indicator.num;

  if (suit === TileSuit.Z) {
    if (num >= 1 && num <= 4) {
      // Winds: East (1z) -> South (2z) -> West (3z) -> North (4z) -> East (1z)
      num = num === 4 ? 1 : num + 1;
    } else if (num >= 5 && num <= 7) {
      // Dragons: White (5z) -> Green (6z) -> Red (7z) -> White (5z)
      num = num === 7 ? 5 : num + 1;
    }
  } else if (suit !== TileSuit.Invalid) {
    // Numbered suits: 1 -> 2 -> ... -> 9 -> 1
    num = num === 9 ? 1 : num + 1;
  }
  return { num, suit };
}

/**
 * Checks if a given tile is a Dora, given a set of active Dora indicators.
 * A tile is Dora if it matches any indicator's target, or if it is an Akadora (red 5).
 */
export function checkIsDora(tile: Tile, indicators: readonly Tile[]): boolean {
  if (tile.akadora) {
    return true;
  }
  for (const ind of indicators) {
    const target = getDoraTargetForIndicator(ind);
    if (tile.suit === target.suit && tile.num === target.num) {
      return true;
    }
  }
  return false;
}

/**
 * Determines if discarding a specific tile will result in a Furiten state.
 *
 * @param tileVal The byte value of the tile being discarded.
 * @param winningWaits The resulting winning waits (tenpai info winning tiles).
 * @param discardedTiles The player's existing discard pile tiles (including claimed ones).
 * @param isAlreadyFuriten Whether the player is already in a permanent furiten state.
 */
export function checkDiscardResultsInFuriten(
  tileVal: number,
  winningWaits: readonly number[],
  discardedTiles: readonly number[],
  isAlreadyFuriten: boolean,
): boolean {
  if (isAlreadyFuriten) {
    return true;
  }

  const normalizedDiscard = tileVal & 0x7f;

  for (const wait of winningWaits) {
    const normalizedWait = wait & 0x7f;
    // 1. If we discard a tile that matches one of our winning waits
    if (normalizedDiscard === normalizedWait) {
      return true;
    }
    // 2. If any of our winning waits is already in our discard pile
    if (discardedTiles.some((d) => (d & 0x7f) === normalizedWait)) {
      return true;
    }
  }

  return false;
}
