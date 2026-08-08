import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { useResultAnimation, useRoom } from '../state/store';
import { hasRyuukyokuArtwork } from '../ui/ryuukyokuArtwork';

/** Full-table fallback for results that do not have a per-player call image. */
export function ResultAnimation3D(): React.JSX.Element | null {
  const resultAnimation = useResultAnimation();
  const room = useRoom();
  const { t } = useTranslation();

  const text = useMemo(() => {
    // Ron and tsumo use the per-seat CallPrompt artwork.
    if (resultAnimation !== 'ryuukyoku' || !room) return null;

    // Abortive draws that ship dedicated artwork are announced by CallPrompt.
    // Rendering this text too would show the same reason twice, at once.
    if (hasRyuukyokuArtwork(room.ryuukyokuReason)) return null;

    const reason = room.ryuukyokuReason ?? 'end_game_ryuukyoku';
    return t(`result.ryuukyoku.${reason}`, {
      defaultValue: t('result.draw'),
    });
  }, [resultAnimation, room, t]);

  if (!text) return null;

  return (
    <Html
      center
      position={[0, 0.4, 0]}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div className="pointer-events-none select-none whitespace-nowrap [perspective:1000px] animate-[result-flash-entrance_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_both]">
        <span
          className="relative inline-block bg-[linear-gradient(120deg,#4a7ab5_0%,#b0d4ff_25%,#ffffff_50%,#b0d4ff_75%,#4a7ab5_100%)] bg-[length:200%_auto] bg-clip-text font-sans text-5xl font-black tracking-[4px] text-transparent uppercase [filter:drop-shadow(0_0_12px_rgba(74,150,255,0.95))_drop-shadow(0_0_30px_rgba(100,200,255,0.6))_drop-shadow(0_4px_8px_rgba(0,0,0,0.8))] animate-[result-flash-idle-ryuukyoku_2.5s_ease-in-out_infinite_alternate,result-shine_3.5s_linear_infinite] before:absolute before:inset-0 before:z-[-1] before:bg-none before:text-[#4a96ff] before:opacity-90 before:blur-[14px] before:content-[attr(data-text)] before:[-webkit-text-fill-color:initial] before:[text-shadow:none] md:text-7xl lg:text-8xl"
          data-text={text}
        >
          {text}
        </span>
      </div>
    </Html>
  );
}
