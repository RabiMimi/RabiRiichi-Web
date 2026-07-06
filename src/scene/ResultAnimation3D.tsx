import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { useResultAnimation, useRoom } from '../state/store';
import { isTsumoTile } from '../domain/model';

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
      const winner = room.players.find((p) => p.gameState?.agari);
      const agari = winner?.gameState?.agari;
      const text = agari
        ? isTsumoTile(agari.incoming)
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
      <div className={`result-flash result-flash-${content.variant}`}>
        <span className="result-flash-text" data-text={content.text}>
          {content.text}
        </span>
      </div>
    </Html>
  );
}
