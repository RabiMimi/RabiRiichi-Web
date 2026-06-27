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
