import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerModel, RoomModel } from '../domain/model';
import { getPlayerDisplayName } from '../domain/model';

interface ScoreTransferPanelProps {
  resultPlayers: PlayerModel[];
  room: RoomModel;
}

/**
 * Renders the round-result "Score Transfers" grid: one card per player showing
 * the +/- delta for this round and the before -> after point totals. `delta`
 * is derived from the frozen `agari.gainPoints`/`losePoints` on each player
 * (see `handleApplyScore` in domain/reducer.ts), and `prevPoints` is simply
 * `currentPoints - delta` since the server never sends the pre-round total
 * directly.
 */
export function ScoreTransferPanel({
  resultPlayers,
  room,
}: ScoreTransferPanelProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="relative z-[1] flex flex-col gap-3 mt-1">
      {/* Title */}
      <div className="flex items-center justify-center gap-3 opacity-90">
        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#ff7a99]/70"></div>
        <span className="text-[0.75rem] font-black text-[#ff7a99] uppercase tracking-[0.2em] drop-shadow-md">
          {t('result.scoreChanges', 'Score Transfers')}
        </span>
        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#ff7a99]/70"></div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {resultPlayers.map((p) => {
          const agari = p.gameState?.agari;
          const delta = (agari?.gainPoints ?? 0) - (agari?.losePoints ?? 0);
          const isDealer = p.seat === room?.info?.dealer;
          const currentPoints =
            p.gameState?.points ??
            room.config?.pointThreshold?.initialPoints ??
            25000;
          const prevPoints = currentPoints - delta;

          const isPositive = delta > 0;
          const isNegative = delta < 0;

          const cardBg = isPositive
            ? 'bg-gradient-to-br from-[#0a2e15]/95 to-[#051a0a]/95 border-[#00ff66]/40 shadow-[0_8px_24px_rgba(0,255,102,0.12)]'
            : isNegative
              ? 'bg-gradient-to-br from-[#3d1118]/95 to-[#1f0509]/95 border-[#ff3366]/40 shadow-[0_8px_24px_rgba(255,51,102,0.12)]'
              : 'bg-gradient-to-br from-[#1c2438]/95 to-[#0f1424]/95 border-[#ffffff]/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)]';

          const textColor = isPositive
            ? 'text-[#00ff66]'
            : isNegative
              ? 'text-[#ff3366]'
              : 'text-[#bbb]';
          const deltaSign = isPositive ? '+' : '';

          return (
            <div
              key={p.id}
              className={`relative flex flex-col items-center justify-between p-3 pt-4 pb-2.5 rounded-xl border backdrop-blur-xl ${cardBg}`}
            >
              {/* Decorative inner glow */}
              {isPositive && (
                <div className="absolute top-0 left-0 right-0 h-[60%] bg-gradient-to-b from-[#00ff66]/10 to-transparent pointer-events-none rounded-t-xl" />
              )}
              {isNegative && (
                <div className="absolute top-0 left-0 right-0 h-[60%] bg-gradient-to-b from-[#ff3366]/10 to-transparent pointer-events-none rounded-t-xl" />
              )}

              {/* Floating Dealer Badge */}
              {isDealer && (
                <span className="absolute -top-2.5 bg-gradient-to-b from-[#ffcf54] to-[#ffaa00] text-[#3d2300] text-xs font-black px-3 py-1 rounded-full leading-none shadow-[0_2px_8px_rgba(255,170,0,0.4)] uppercase tracking-wider border border-[#ffeaa7]">
                  {t('hud.dealer')}
                </span>
              )}

              {/* Header: Name */}
              <div className="flex flex-col items-center z-10 w-full mb-1">
                <span className="font-bold text-[0.95rem] truncate w-full text-center text-[#f8f9fa] drop-shadow-md">
                  {getPlayerDisplayName(p, t)}
                </span>
              </div>

              {/* Score Delta */}
              <div className="flex flex-col items-center z-10 mb-2">
                <span
                  className={`font-mono text-[1.35rem] font-black drop-shadow-lg ${textColor}`}
                >
                  {deltaSign}
                  {delta.toString()}
                </span>
              </div>

              {/* Score Transition */}
              <div className="flex items-center gap-2 z-10 bg-black/50 px-2 py-1 rounded-md w-full justify-center border border-white/10 shadow-inner">
                <span className="font-mono text-[0.75rem] text-[#888] line-through decoration-[#ff7a99]/60 decoration-2">
                  {prevPoints.toString()}
                </span>
                <span className="font-mono text-[0.85rem] font-bold text-[#e2e8f0]">
                  {currentPoints.toString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
