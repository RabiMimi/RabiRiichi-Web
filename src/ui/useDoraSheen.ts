import { useEffect, type RefObject } from 'react';
import { getDoraSheenProgress, toGradientPercent } from '../lib/doraSheen';

const SHEEN_POSITION_VAR = '--dora-sheen-pos';
const sheenElements = new Set<HTMLElement>();
let frameId: number | null = null;

function tick(): void {
  // One reading per frame for every tile, and the same clock the 3D tiles use.
  const position = `${toGradientPercent(getDoraSheenProgress(performance.now()))}%`;
  for (const element of sheenElements) {
    element.style.setProperty(SHEEN_POSITION_VAR, position);
  }
  frameId = sheenElements.size > 0 ? requestAnimationFrame(tick) : null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Drives the `.dora-sheen` band on a DOM hand tile from the shared sheen
 * timeline. A per-element CSS animation would start whenever its tile mounted,
 * so tiles drifted apart, and it was seen to stall in the Android app; writing
 * the band's position each frame keeps every tile on one clock.
 */
export function useDoraSheen(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    if (prefersReducedMotion()) {
      // Keep the Dora cue, but as a still band across the middle.
      element.style.setProperty(SHEEN_POSITION_VAR, '50%');
      return () => element.style.removeProperty(SHEEN_POSITION_VAR);
    }

    sheenElements.add(element);
    frameId ??= requestAnimationFrame(tick);
    return () => {
      sheenElements.delete(element);
      element.style.removeProperty(SHEEN_POSITION_VAR);
    };
  }, [ref, enabled]);
}
