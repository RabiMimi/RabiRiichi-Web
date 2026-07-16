export const SILENT_WAV_URL =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA';

export function getYakuVoiceLineId(src: string, val: number): string | null {
  switch (src) {
    case 'Riichi':
      return 'yakuRiichi';
    case 'DoubleRiichi':
      return 'doubleRiichiYaku';
    case 'Ippatsu':
      return 'ippatsu';
    case 'MenzenchinTsumohou':
      return 'menzenTsumo';
    case 'Tanyao':
      return 'tanyao';
    case 'Pinfu':
      return 'pinfu';
    case 'Iipeikou':
      return 'iipeikou';
    case 'YakuhaiHaku':
      return 'yakuhaiHaku';
    case 'YakuhaiHatsu':
      return 'yakuhaiHatsu';
    case 'YakuhaiChun':
      return 'yakuhaiChun';
    case 'YakuhaiBakaze':
      return 'kazeTon';
    case 'YakuhaiJikaze':
      return 'kazeTon';
    case 'RinshanKaihou':
      return 'rinshan';
    case 'Chankan':
      return 'chankan';
    case 'HaiteiRaoyue':
      return 'haitei';
    case 'HouteiRaoyui':
      return 'houtei';
    case 'SanshokuDoujun':
      return 'sanshoku';
    case 'Ittsu':
      return 'ittsuu';
    case 'Chantaiyao':
      return 'chanta';
    case 'Toitoi':
      return 'toitoi';
    case 'Sanankou':
      return 'sanankou';
    case 'SanshokuDoukou':
      return 'sanshokuDoukou';
    case 'Sankantsu':
      return 'sankantsu';
    case 'Honroutou':
      return 'honroutou';
    case 'Shousangen':
      return 'shousangen';
    case 'Chiitoitsu':
      return 'chiitoitsu';
    case 'Honitsu':
      return 'honitsu';
    case 'JunchanTaiyao':
      return 'junchan';
    case 'Ryanpeikou':
      return 'ryanpeikou';
    case 'Chinitsu':
      return 'chinitsu';
    case 'Tenhou':
      return 'tenhou';
    case 'Chiihou':
      return 'chiihou';
    case 'Daisangen':
      return 'daisangen';
    case 'Suuankou':
      return 'suuankou';
    case 'SuuankouTanki':
      return 'suuankouTanki';
    case 'Tsuuiisou':
      return 'tsuuiisou';
    case 'Ryuuiisou':
      return 'ryuuiisou';
    case 'Chinroutou':
      return 'chinroutou';
    case 'KokushiMusou':
      return 'kokushi';
    case 'KokushiMusouJuusanmenMachi':
      return 'kokushiJuusanmen';
    case 'Shousuushii':
      return 'shousuushii';
    case 'Daisuushii':
      return 'daisuushii';
    case 'Suukantsu':
      return 'suukantsu';
    case 'ChuurenPoutou':
      return 'chuuren';
    case 'JunseiChuurenPoutou':
      return 'junseiChuuren';
    case 'HelloWorld':
      return 'helloWorld';
    case 'Dora':
    case 'Akadora':
    case 'Uradora':
    case 'NukiDora':
      if (val >= 1 && val <= 12) {
        return `dora${val}`;
      } else if (val > 12) {
        return 'doraMany';
      }
      return 'dora1';
    case 'NagashiMangan':
      return 'nagashiMangan';
    default:
      if (src.length > 0) {
        return src.charAt(0).toLowerCase() + src.slice(1);
      }
      return null;
  }
}

export function getLimitName(
  han: number,
  fu: number,
  scoringOption: number,
): string | null {
  if (han >= 11) return 'sanbaiman';
  if (han >= 8) return 'baiman';
  if (han >= 6) return 'haneman';
  if (han >= 5) return 'mangan';

  const hasKiriage = (scoringOption & 1) !== 0;
  let score = fu * (1 << (han + 2));
  if (hasKiriage && score > 1900 && score < 2000) {
    score = 2000;
  }
  if (score >= 2000) {
    return 'mangan';
  }

  return null;
}
