import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import { rabiriichi } from '../net/client';
import { getIntersectedTileTraceId, TouchTileHoverState } from './tileHover';

/** Pointer capture keeps a drag alive; hit testing still follows the finger. */
export function TouchTileHover(): null {
  const { camera, scene, gl } = useThree();

  useEffect(() => {
    const state = new TouchTileHoverState();
    const raycaster = new Raycaster();
    const point = new Vector2();
    let frame = 0;
    let lastPointer: PointerEvent | null = null;

    const hitTest = (pointer: PointerEvent): number | null => {
      const element = document.elementFromPoint(
        pointer.clientX,
        pointer.clientY,
      );
      const handTile = element?.closest<HTMLElement>('[data-hand-tile]');
      if (handTile) {
        if (handTile.dataset.identifiable !== 'true') return null;
        const id = Number(handTile.dataset.handTile);
        return Number.isFinite(id) && id > 0 ? id : null;
      }
      // UI overlays must not inspect a table tile hidden behind them.
      if (element !== gl.domElement) return null;
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      point.set(
        ((pointer.clientX - rect.left) / rect.width) * 2 - 1,
        -((pointer.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(point, camera);
      return getIntersectedTileTraceId(
        raycaster
          .intersectObjects(scene.children, true)
          .map((hit) => hit.object),
      );
    };

    const publish = () => {
      if (rabiriichi.hoveredTileTraceId !== state.traceId) {
        rabiriichi.hoverTile(state.traceId);
      }
    };
    const move = (pointer: PointerEvent) => {
      if (!state.ownsPointer(pointer.pointerId)) return;
      state.move(pointer.pointerId, hitTest(pointer));
      publish();
      lastPointer = pointer;
      // Recheck after the dragged DOM tile has rendered at its new position.
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (lastPointer && state.ownsPointer(lastPointer.pointerId)) {
            state.move(lastPointer.pointerId, hitTest(lastPointer));
            publish();
          }
        });
      }
    };
    const begin = (pointer: PointerEvent) => {
      if (state.begin(pointer)) move(pointer);
    };
    const end = (pointer: PointerEvent) => {
      if (state.end(pointer.pointerId)) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastPointer = null;
        publish();
      }
    };
    const clear = () => {
      const previousTraceId = state.traceId;
      state.clear();
      cancelAnimationFrame(frame);
      frame = 0;
      lastPointer = null;
      if (
        previousTraceId != null &&
        rabiriichi.hoveredTileTraceId === previousTraceId
      ) {
        publish();
      }
    };

    window.addEventListener('pointerdown', begin, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
    window.addEventListener('blur', clear);
    return () => {
      clear();
      window.removeEventListener('pointerdown', begin, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
      window.removeEventListener('blur', clear);
    };
  }, [camera, scene, gl]);

  return null;
}
