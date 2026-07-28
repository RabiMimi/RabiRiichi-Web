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
  const has = (bit: number): boolean => (scoringOption & bit) !== 0;
  // Turning yakuman off clears the options that depend on it, which is the same
  // field as turning aotenjou on.
  const yakumanOff = scoringOption & ~2 & ~4 & ~8;
  const needsYakuman = !has(2);

  return [
    {
      key: 'kiriageMangan',
      labelKey: 'advanced.scoring.kiriageMangan',
      checked: has(1),
      disabled: isLoading,
      next: scoringOption ^ 1,
    },
    {
      key: 'aotenjou',
      labelKey: 'advanced.scoring.aotenjou',
      checked: !has(2),
      disabled: isLoading,
      next: has(2) ? yakumanOff : scoringOption | 2,
    },
    {
      key: 'yakuman',
      labelKey: 'advanced.scoring.yakuman',
      checked: has(2),
      disabled: isLoading,
      next: has(2) ? yakumanOff : scoringOption | 2,
    },
    {
      key: 'multipleYakuman',
      labelKey: 'advanced.scoring.multipleYakuman',
      checked: has(4),
      disabled: isLoading || needsYakuman,
      // Enabling a dependent option implies yakuman scoring.
      next: has(4) ? scoringOption & ~4 : scoringOption | 4 | 2,
    },
    {
      key: 'kazoeYakuman',
      labelKey: 'advanced.scoring.kazoeYakuman',
      checked: has(8),
      disabled: isLoading || needsYakuman,
      next: has(8) ? scoringOption & ~8 : scoringOption | 8 | 2,
    },
  ];
}
