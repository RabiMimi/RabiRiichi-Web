import type { PlayerAgariState } from '../domain/model';
import { isTsumoTile } from '../domain/model';

export interface ResultBadge {
  /** Localized text, e.g. "Ron" / "Tsumo" / "Tenpai". */
  label: string;
  /** Tailwind classes conveying the same distinction as the label. */
  className: string;
}

export interface ResultBadgeInput {
  agari: PlayerAgariState;
  t: (key: string) => string;
}

/**
 * How a player finished the hand: won by ron/tsumo, kept a nagashi mangan, or
 * merely ended tenpai at an exhaustive draw.
 *
 * The per-round result card shows several players at once, so each needs to say
 * what it is on its own — a bare score delta does not distinguish a ron from a
 * tenpai payment.
 */
export function getResultBadge({ agari, t }: ResultBadgeInput): ResultBadge {
  const isNagashi = agari.isNagashi ?? false;
  const isTenpai = agari.isTenpai ?? false;

  if (isNagashi) {
    return {
      label: t('yaku.NagashiMangan'),
      className: 'bg-[#00bcff]/20 text-[#00e5ff]',
    };
  }
  if (isTenpai) {
    return {
      label: t('result.tenpai'),
      className: 'bg-white/10 text-[#cccccc]',
    };
  }
  // Prefer the server's authoritative flag; fall back to inspecting the tile,
  // which is absent for a self-draw.
  const isTsumo = agari.isTsumo ?? isTsumoTile(agari.incoming);
  return {
    label: isTsumo ? t('hud.action.tsumo') : t('hud.action.ron'),
    className: 'bg-[#ff7a99]/20 text-[#ff7a99]',
  };
}
