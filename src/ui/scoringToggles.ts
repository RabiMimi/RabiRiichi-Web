import { ScoringOption } from '../proto';

/**
 * Which scoring options are on, and what the bitfield becomes if each is
 * toggled. Kept pure and free of React so the interlocking rules can be tested.
 */

export interface ScoringToggle {
  key: string;
  labelKey: string;
  checked: boolean;
  disabled: boolean;
  /** The whole scoring bitfield after this toggle is flipped. */
  next: number;
}

/**
 * Scoring flags share a bitfield with interlocking rules, so each entry states
 * its own bit, whether it can be touched, and what the whole field becomes when
 * toggled. Written out as five near-identical blocks it was hard to see that
 * aotenjou is simply the inverse of the yakuman bit.
 */
export function scoringToggles(
  scoringOption: number,
  isLoading: boolean,
): ScoringToggle[] {
  const KIRIAGE = ScoringOption.SCORING_OPTION_KIRIAGE_MANGAN;
  const YAKUMAN = ScoringOption.SCORING_OPTION_YAKUMAN;
  const MULTIPLE = ScoringOption.SCORING_OPTION_MULTIPLE_YAKUMAN;
  const KAZOE = ScoringOption.SCORING_OPTION_KAZOE_YAKUMAN;

  const has = (bit: number): boolean => (scoringOption & bit) !== 0;
  // Turning yakuman off clears the options that depend on it, which is the same
  // field as turning aotenjou on.
  const yakumanOff = scoringOption & ~YAKUMAN & ~MULTIPLE & ~KAZOE;
  const needsYakuman = !has(YAKUMAN);

  return [
    {
      key: 'kiriageMangan',
      labelKey: 'advanced.scoring.kiriageMangan',
      checked: has(KIRIAGE),
      disabled: isLoading,
      next: scoringOption ^ KIRIAGE,
    },
    {
      key: 'aotenjou',
      labelKey: 'advanced.scoring.aotenjou',
      checked: !has(YAKUMAN),
      disabled: isLoading,
      next: has(YAKUMAN) ? yakumanOff : scoringOption | YAKUMAN,
    },
    {
      key: 'yakuman',
      labelKey: 'advanced.scoring.yakuman',
      checked: has(YAKUMAN),
      disabled: isLoading,
      next: has(YAKUMAN) ? yakumanOff : scoringOption | YAKUMAN,
    },
    {
      key: 'multipleYakuman',
      labelKey: 'advanced.scoring.multipleYakuman',
      checked: has(MULTIPLE),
      disabled: isLoading || needsYakuman,
      // Enabling a dependent option implies yakuman scoring.
      next: has(MULTIPLE)
        ? scoringOption & ~MULTIPLE
        : scoringOption | MULTIPLE | YAKUMAN,
    },
    {
      key: 'kazoeYakuman',
      labelKey: 'advanced.scoring.kazoeYakuman',
      checked: has(KAZOE),
      disabled: isLoading || needsYakuman,
      next: has(KAZOE)
        ? scoringOption & ~KAZOE
        : scoringOption | KAZOE | YAKUMAN,
    },
  ];
}
