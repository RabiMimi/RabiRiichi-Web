import { IInit } from '../init';
import { TileSuit, TileSuitToString } from '../riichi/tile';
import { EnumValues } from '../util/enum';

class TileImageManager implements IInit {
  private readonly imageDict: { [key: string]: string } = {};

  public readonly serviceName = TileImageManager.name;

  public async init() {
    for (let i = 1; i <= 9; i++) {
      for (const j of EnumValues(TileSuit)) {
        if (j === TileSuit.Invalid) {
          continue;
        }
        const key = `${i}${TileSuitToString(j)}`;
        const path = `./img/tile/${key}.png`;
        this.imageDict[key] = await import(path);
      }
    }
  }
}

export const TileImage = new TileImageManager();
