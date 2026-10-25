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

/**
 * Drives the `.dora-sheen` band on a DOM hand tile from the shared sheen
 * timeline. A per-element CSS animation would start whenever its tile mounted,
 * so tiles drifted apart; writing the band's position each frame keeps every
 * tile on one clock.
 *
 * This deliberately ignores `prefers-reduced-motion`, like the 3D tiles'
 * shader: Android's "Remove animations" setting reports it, and honouring it
 * here froze only the hand while the river kept shining.
 */
export function useDoraSheen(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;

    sheenElements.add(element);
    frameId ??= requestAnimationFrame(tick);
    return () => {
      sheenElements.delete(element);
      element.style.removeProperty(SHEEN_POSITION_VAR);
    };
  }, [ref, enabled]);
}
