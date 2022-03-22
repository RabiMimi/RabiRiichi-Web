import { IInit } from '../init.interface';
import { TileSuit, TileSuitToString } from '../riichi/tile';
import { EnumValues } from '../util/enum';
import { sleep } from '../util/timer';
import back from './img/tile/back.png';

class TileImageManager implements IInit {
  private readonly imageDict: { [key: string]: string } = {};
  private tileBack: string = back;

  public readonly serviceName = TileImageManager.name;

  public getImage(key: string): string {
    return this.imageDict[key] ?? this.tileBack;
  }

  public async init() {
    const suits = EnumValues(TileSuit).E.where((s) => s !== TileSuit.Invalid);
    for (const j of suits) {
      if (j === TileSuit.Invalid) {
        continue;
      }
      for (let i = 1; i <= (j === TileSuit.Z ? 7 : 9); i++) {
        const key = `${i}${TileSuitToString(j)}`;
        this.imageDict[key] = await import(`./img/tile/${key}.png`);
      }
    }
    await sleep(1000);
  }
}

export const TileImage = new TileImageManager();
