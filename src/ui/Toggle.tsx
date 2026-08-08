import React from 'react';

export type ToggleAppearance = 'chip' | 'inline';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  /**
   * Some of the group is on. Draws the knob mid-track, the way a native
   * checkbox's `indeterminate` reads, without the native glyph.
   */
  indeterminate?: boolean;
  disabled?: boolean;
  /**
   * `chip` gives the control its own rounded card that lights up when on, for
   * grids of options. `inline` is the bare switch plus label, for dense lists
   * where a card per row would be noise.
   */
  appearance?: ToggleAppearance;
  className?: string;
}

const CHIP_BASE =
  'flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-left leading-[1.2] ' +
  'transition-all duration-200 cursor-pointer select-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50 outline-none';

const CHIP_ON =
  'bg-[#ff7a99]/15 border-[#ff7a99] text-white ' +
  'shadow-[0_0_10px_rgba(255,122,153,0.25),inset_0_0_4px_rgba(255,122,153,0.15)]';

const CHIP_OFF =
  'bg-[#1e1e1e] border-[#3a3a3a] text-[#ccc] ' +
  'hover:not-disabled:bg-[#2a2a2a] hover:not-disabled:border-[#ff7a99] hover:not-disabled:text-white';

const INLINE_BASE =
  'flex items-center gap-2 text-left leading-[1.2] bg-transparent border-none p-0 ' +
  'transition-colors duration-150 cursor-pointer select-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50 outline-none';

/**
 * The on/off indicator: a small track whose knob slides, replacing the native
 * checkbox. The native control could not be styled to the palette — there is no
 * `accent-color` anywhere in the app, so every checkbox rendered in the browser
 * default blue, against a pink and cyan UI.
 */
function Switch({
  checked,
  indeterminate,
}: {
  checked: boolean;
  indeterminate: boolean;
}): React.JSX.Element {
  const on = checked || indeterminate;
  const knobOffset = indeterminate ? 'translate-x-[6px]' : 'translate-x-3';
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors duration-200 ${
        on
          ? 'bg-[#ff7a99]/70 border-[#ff7a99]'
          : 'bg-white/[0.06] border-white/20'
      }`}
    >
      <span
        className={`absolute left-[2px] h-3 w-3 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-transform duration-200 ${
          checked || indeterminate ? knobOffset : 'translate-x-0'
        } ${on ? '' : 'opacity-70'}`}
      />
    </span>
  );
}

/**
 * Shared on/off control for rule and yaku selection.
 *
 * Replaces the three divergent native-checkbox treatments these screens had
 * grown (a bordered yaku card, and two bare labels differing only in a
 * `scale-[0.85]` hack), none of which changed appearance with their own state:
 * the only on/off signal was the browser's default checkbox.
 */
export function Toggle({
  checked,
  onChange,
  label,
  indeterminate = false,
  disabled = false,
  appearance = 'chip',
  className = '',
}: ToggleProps): React.JSX.Element {
  const chrome =
    appearance === 'chip'
      ? `${CHIP_BASE} ${checked ? CHIP_ON : CHIP_OFF}`
      : `${INLINE_BASE} ${checked ? 'text-white' : 'text-[#ccc] hover:not-disabled:text-white'}`;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={onChange}
      className={`${chrome} ${className}`}
    >
      <Switch checked={checked} indeterminate={indeterminate} />
      <span className="min-w-0">{label}</span>
    </button>
  );
}
