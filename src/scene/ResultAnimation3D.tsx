import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { useResultAnimation, useRoom } from '../state/store';

/**
 * Full-table end-of-hand flourish shown before the result panel.
 *
 * Rendered as an HTML overlay (via drei's `Html`) rather than 3D text so it can
 * use the system font stack and render CJK result strings without bundling or
 * fetching a font. The visual flair lives in CSS (see `.result-flash-*` in
 * ui.css).
 */
export function ResultAnimation3D(): React.JSX.Element | null {
  const resultAnimation = useResultAnimation();
  const room = useRoom();
  const { t } = useTranslation();

  const content = useMemo(() => {
    if (!resultAnimation || !room) return null;

    if (resultAnimation === 'agari') {
      const winner = room.players.find((p) => p.gameState?.agari?.incoming);
      const agari = winner?.gameState?.agari;
      const text = agari
        ? agari.isTsumo
          ? t('hud.action.tsumo')
          : t('hud.action.ron')
        : t('result.agari');
      return { text, variant: 'agari' as const };
    }

    const reason = room.ryuukyokuReason ?? 'end_game_ryuukyoku';
    const text = t(`result.ryuukyoku.${reason}`, {
      defaultValue: t('result.draw'),
    });
    return { text, variant: 'ryuukyoku' as const };
  }, [resultAnimation, room, t]);

  if (!content) return null;

  return (
    <Html
      center
      position={[0, 0.4, 0]}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        className={`pointer-events-none select-none whitespace-nowrap [perspective:1000px] animate-[result-flash-entrance_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_both]`}
      >
        <span
          className={`relative inline-block font-sans font-black text-[80px] tracking-[4px] text-white uppercase before:content-[attr(data-text)] before:absolute before:inset-0 before:z-[-1] before:[-webkit-text-fill-color:initial] before:bg-none before:[text-shadow:none] ${
            content.variant === 'agari'
              ? 'bg-[linear-gradient(120deg,#ff4500_0%,#ffd700_25%,#ffffff_50%,#ffd700_75%,#ff4500_100%)] bg-[length:200%_auto] bg-clip-text text-transparent animate-[result-flash-idle-agari_2.5s_ease-in-out_infinite_alternate,result-shine_3.5s_linear_infinite] [filter:drop-shadow(0_0_12px_rgba(255,140,0,0.95))_drop-shadow(0_0_25px_rgba(255,69,0,0.7))_drop-shadow(0_4px_10px_rgba(0,0,0,0.8))] before:text-[#ff4500] before:blur-[14px] before:opacity-95'
              : 'bg-[linear-gradient(120deg,#4a7ab5_0%,#b0d4ff_25%,#ffffff_50%,#b0d4ff_75%,#4a7ab5_100%)] bg-[length:200%_auto] bg-clip-text text-transparent animate-[result-flash-idle-ryuukyoku_2.5s_ease-in-out_infinite_alternate,result-shine_3.5s_linear_infinite] [filter:drop-shadow(0_0_12px_rgba(74,150,255,0.95))_drop-shadow(0_0_30px_rgba(100,200,255,0.6))_drop-shadow(0_4px_8px_rgba(0,0,0,0.8))] before:text-[#4a96ff] before:blur-[14px] before:opacity-90'
          }`}
          data-text={content.text}
        >
          {content.text}
        </span>
      </div>
    </Html>
  );
}
