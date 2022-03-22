import { IsDigit } from '../util/char';

export enum TileSuit {
  Invalid,
  M,
  P,
  S,
  Z,
}

export function ToTileSuit(c: string): TileSuit {
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

export function TileSuitToString(suit: TileSuit): string {
  switch (suit) {
    case TileSuit.M:
      return 'm';
    case TileSuit.P:
      return 'p';
    case TileSuit.S:
      return 's';
    case TileSuit.Z:
      return 'z';
    default:
      return '?';
  }
}

export class Tile {
  public constructor(
    public num: number,
    public suit: TileSuit,
    public akadora: boolean,
  ) {}

  public toString(): string {
    return `${this.akadora ? 'r' : ''}${this.num}${TileSuitToString(
      this.suit,
    )}`;
  }
}

export function StringToTiles(str: string): Tile[] {
  let isDora = false;
  let num = 1;
  const tiles: Tile[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (IsDigit(c)) {
      if (c === '0') {
        num = 5;
        isDora = true;
      } else {
        num = +c;
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
    const suit = ToTileSuit(c);
    if (suit === TileSuit.Invalid) {
      throw new Error(`Invalid tile suit in ${str} at ${i}`);
    }
    for (let j = tiles.length - 1; j >= 0; j--) {
      const tile = tiles[j];
      if (tile.suit !== TileSuit.Invalid) {
        break;
      }
      tile.suit = suit;
    }
  }
  if (tiles.E.any((t) => t.suit === TileSuit.Invalid)) {
    throw new Error(`Some tile suits not provided in ${str}`);
  }
  return tiles;
}
