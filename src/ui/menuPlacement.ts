/**
 * Where to put a dropdown menu next to its trigger, in viewport coordinates.
 *
 * Menus are rendered in a portal with fixed positioning: drawn inside the
 * trigger's own box they were clipped by every scrolling ancestor (modals,
 * settings tabs, the lobby card) and ran off the bottom of a landscape phone.
 * Kept free of the DOM so the geometry is unit-testable.
 */

export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface MenuPlacementOptions {
  /** Width the menu is laid out at (px); clamped to fit the viewport. */
  width: number;
  /** Tallest the menu should grow (px) when there is room. */
  maxHeight: number;
  /** Below this much room under the trigger, prefer a roomier side above. */
  minHeight: number;
  /** Which trigger edge the menu lines up with. */
  align: 'start' | 'end';
  /** Space between trigger and menu (px). */
  gap?: number;
  /** Space kept clear at the viewport edges (px). */
  margin?: number;
}

export interface MenuPlacement {
  /** Exactly one of `top` (opens down) and `bottom` (opens up) is set. */
  top?: number;
  bottom?: number;
  left: number;
  /** Distance from the viewport's right edge, for right-anchored menus. */
  right: number;
  width: number;
  maxHeight: number;
}

const DEFAULT_GAP = 6;
const DEFAULT_MARGIN = 8;

export function computeMenuPlacement(
  anchor: AnchorRect,
  bounds: ViewportSize,
  options: MenuPlacementOptions,
): MenuPlacement {
  const gap = options.gap ?? DEFAULT_GAP;
  const margin = options.margin ?? DEFAULT_MARGIN;

  const spaceBelow = Math.max(0, bounds.height - anchor.bottom - gap - margin);
  const spaceAbove = Math.max(0, anchor.top - gap - margin);
  const opensUp =
    spaceBelow < Math.min(options.minHeight, options.maxHeight) &&
    spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    options.maxHeight,
    opensUp ? spaceAbove : spaceBelow,
  );

  const width = Math.min(options.width, bounds.width - 2 * margin);
  const preferredLeft =
    options.align === 'start' ? anchor.left : anchor.right - width;
  const left = clamp(preferredLeft, margin, bounds.width - margin - width);

  return {
    ...(opensUp
      ? { bottom: bounds.height - anchor.top + gap }
      : { top: anchor.bottom + gap }),
    left,
    right: bounds.width - left - width,
    width,
    maxHeight,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
