import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';
import { ScoringType } from '../proto';
import type { PlayerModel, RoomModel } from '../domain/model';
import { getPlayerDisplayName } from '../domain/model';
import { filterYakuListForDisplay } from '../domain/yakus';
import { getLimitName } from '../domain/resultHelpers';

const LIMIT_BADGE_STYLES: Record<string, string> = {
  'limit-mangan': 'bg-[#ff7a99]',
  'limit-haneman': 'bg-[#8c7aff]',
  'limit-baiman': 'bg-[#ffb830]',
  'limit-sanbaiman': 'bg-[#ff6e30]',
  'limit-yakuman': 'bg-[#ff3333]',
};

interface WinnerDetailCardProps {
  player: PlayerModel;
  visibleYakuCount: number;
  showTotal: boolean;
  isCardStarted: boolean;
  room: RoomModel;
}

export function WinnerDetailCard({
  player,
  visibleYakuCount,
  showTotal,
  isCardStarted,
  room,
}: WinnerDetailCardProps): React.JSX.Element | null {
  const { t } = useTranslation();

  const agari = player.gameState?.agari;
  if (!agari) return null;
  if (!agari.scores && !agari.isTenpai) return null;

  const isNagashi = agari.isNagashi ?? false;
  const isTenpai = agari.isTenpai ?? false;

  let badgeText = t('result.winnerBadge');
  if (isTenpai) {
    badgeText = t('result.tenpai');
  }

  let limitLabel: string | null = null;
  let hanFuLabel = '';
  let limitClass = '';

  if (isNagashi) {
    limitLabel = t('result.mangan');
    limitClass = 'limit-mangan';
  } else if (isTenpai) {
    // nothing
  } else if (agari.scores?.result) {
    const result = agari.scores.result;
    const isAotenjou =
      room.config?.scoringOption != null &&
      (room.config.scoringOption & 2) === 0;

    if (result.finalYakuman && result.finalYakuman > 0) {
      limitClass = 'limit-yakuman';
      if (result.kazoeYakuman && result.kazoeYakuman > 0 && !isAotenjou) {
        limitLabel = t('result.yakuman');
        hanFuLabel = t('result.han', { count: result.han });
      } else {
        const yakumanCount = result.finalYakuman;
        if (yakumanCount > 1) {
          const key = `result.multipleYakuman_${yakumanCount}`;
          limitLabel = t(key, {
            defaultValue: t('result.multipleYakuman', {
              count: yakumanCount,
            }),
          });
        } else {
          limitLabel = t('result.yakuman');
        }
      }
    } else {
      const limit = isAotenjou
        ? null
        : getLimitName(
            result.han ?? 0,
            result.fu ?? 0,
            room.config?.scoringOption ?? 0,
          );

      if (limit) {
        limitLabel = t(`result.${limit}`);
        limitClass = `limit-${limit}`;
        hanFuLabel = t('result.fuAndHan', {
          fu: result.fu,
          han: result.han,
        });
      } else {
        hanFuLabel = t('result.fuAndHan', {
          fu: result.fu,
          han: result.han,
        });
      }
    }
  }

  const rawYakuList = agari.scores?.items ?? [];
  const yakuList = filterYakuListForDisplay(
    rawYakuList,
    room.config?.scoringOption,
  );

  const handTiles = player.gameState?.hand.freeTiles ?? [];
  const calledMelds = player.gameState?.hand.called ?? [];

  const cardStyles = isNagashi
    ? 'bg-[#1c304d]/85 border-[#00bcff]'
    : 'bg-[#2b2b2b]/75 border-[#444]';

  const badgeColor = isNagashi ? 'bg-[#00bcff]' : 'bg-[#ff3333]';

  const finalLimitClass = isNagashi
    ? 'bg-[#00bcff] text-[#1a1a1a]'
    : `${LIMIT_BADGE_STYLES[limitClass] ?? 'bg-gray-500'} text-white`;

  const finalHanFuColor = isNagashi ? 'text-[#00e5ff]' : 'text-[#ff7a99]';

  return (
    <div
      key={player.id}
      className={`rounded-xl flex flex-col border transition-all duration-700 ease-out transform ${cardStyles} ${
        isCardStarted
        ? 'opacity-100 translate-y-0 scale-100 p-2 sm:p-3 gap-1.5 sm:gap-2 max-h-screen'
          : 'opacity-0 -translate-y-4 scale-95 p-0 border-none gap-0 overflow-hidden max-h-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-1.5 sm:gap-3">
        <span
          className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-white ${badgeColor}`}
        >
          {badgeText}
        </span>
        <span className="text-xs sm:text-lg font-bold">
          {getPlayerDisplayName(player, t)}
        </span>
        {isTenpai ? (
          player.gameState?.awaitedTiles &&
          player.gameState.awaitedTiles.length > 0 && (
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-[#aaa] font-bold">
                {t('result.tenpaiWaits', 'Waits')}:
              </span>
              <div className="flex gap-1.5">
                {player.gameState.awaitedTiles.map((ti, idx) => {
                  const tileStr = Tile.fromByte(ti.winningTile).toString();
                  return (
                    <img
                      key={idx}
                      src={getTileTexturePath(tileStr)}
                      alt={tileStr}
                      className="w-6 h-8 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                    />
                  );
                })}
              </div>
            </div>
          )
        ) : (
          <div
            className={`ml-auto flex items-center gap-2 transition-all duration-700 ease-out transform ${
              showTotal
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-4 pointer-events-none'
            }`}
          >
            {limitLabel && (
              <span
                  className={`text-xs sm:text-sm font-bold px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] ${finalLimitClass}`}
              >
                {limitLabel}
              </span>
            )}
            {hanFuLabel && (
                <span className={`font-bold text-sm sm:text-lg ${finalHanFuColor}`}>
                {hanFuLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {isNagashi ? (
        <div className="flex flex-col gap-2 bg-[#141414]/40 p-3 rounded-md">
          <span className="text-[10px] sm:text-xs text-[#88a8cc] uppercase font-bold">
            {t('result.river')}
          </span>
          <div className="flex flex-wrap gap-0.5 lg:gap-1">
            {(player.gameState?.hand.discarded ?? []).map((tileMsg, idx) => {
              const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
              return (
                <img
                  key={tileMsg.traceId ?? idx}
                  src={getTileTexturePath(tileStr)}
                  alt={tileStr}
                  className="w-[22px] h-[29px] sm:w-8 sm:h-[42px] rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                />
              );
            })}
          </div>
        </div>
      ) : (
          <div className="flex flex-wrap gap-0.5 lg:gap-1 bg-[#1a1a1a] p-1 sm:p-1.5 rounded-md items-center">
            <div className="flex gap-0.5 lg:gap-1">
            {handTiles.map((tileMsg, idx) => {
              const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
              return (
                <img
                  key={tileMsg.traceId ?? idx}
                  src={getTileTexturePath(tileStr)}
                  alt={tileStr}
                  className="w-[22px] h-[29px] sm:w-8 sm:h-[42px] rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                />
              );
            })}
          </div>
          {/* Winning tile */}
          {agari.incoming && (
              <div className="ml-2 lg:ml-3 border-l-2 border-zinc-700 pl-2 lg:pl-3 flex items-center">
                <div className="relative flex">
                  <span className="absolute -top-2.5 sm:-top-3.5 left-1/2 -translate-x-1/2 bg-[#ff7a99] text-[#fff] text-[9px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-sm leading-none z-[2] select-none border border-[#ffccd5] whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                    {t('result.winTile')}
                  </span>
                  <img
                    src={getTileTexturePath(
                      Tile.fromByte(agari.incoming.tile ?? 0).toString(),
                    )}
                    alt="winning-tile"
                    className="w-[22px] h-[29px] sm:w-8 sm:h-[42px] rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)] border-2 border-[#ff7a99]"
                  />
                </div>
            </div>
          )}
          {/* Called melds */}
          {calledMelds.map((meld, meldIdx) => {
            const tiles = meld.tiles ?? [];
            return (
              <div
                key={meldIdx}
                className="flex gap-0.5 lg:gap-1 ml-2 lg:ml-3 border-l-2 border-zinc-700 pl-2 lg:pl-3"
              >
                {tiles.map((tile, tileIdx) => {
                  const tileStr = Tile.fromByte(tile.tile ?? 0).toString();
                  return (
                    <img
                      key={tile.traceId ?? tileIdx}
                      src={getTileTexturePath(tileStr)}
                      alt={tileStr}
                      className="w-[22px] h-[29px] sm:w-8 sm:h-[42px] rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* List of Yaku */}
      {!isTenpai && (
        <div className="grid grid-cols-2 gap-x-1.5 sm:gap-x-4 gap-y-0.5 sm:gap-y-2 text-[10px] sm:text-sm">
          {/* Column 1 */}
          <div className="flex flex-col gap-0.5 sm:gap-2">
            {yakuList
              .slice(0, Math.ceil(yakuList.length / 2))
              .map((yaku, idx) => {
                const globalIdx = idx;
                const typeLabel =
                  yaku.Src === 'NagashiMangan'
                    ? ''
                    : yaku.Type === ScoringType.SCORING_TYPE_YAKUMAN
                      ? t('result.yakuman')
                      : t('result.han', { count: yaku.Val });
                const isRevealed = globalIdx < visibleYakuCount;
                return (
                  <div
                    key={idx}
                    className={`bg-white/[0.08] border border-white/15 rounded-[6px] px-2 py-0.75 sm:px-2.5 sm:py-1 flex items-center justify-between gap-1 lg:gap-1.5 transition-all duration-500 ease-out transform ${
                      isRevealed
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                  >
                    <span className="text-[#ddd] truncate flex-1 text-left">
                      {t(`yaku.${yaku.Src ?? ''}`, {
                        defaultValue: yaku.Src ?? '',
                      })}
                    </span>
                    <span className="text-[#ffaa44] font-bold">
                      {typeLabel}
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-0.5 sm:gap-2">
            {yakuList.slice(Math.ceil(yakuList.length / 2)).map((yaku, idx) => {
              const half = Math.ceil(yakuList.length / 2);
              const globalIdx = half + idx;
              const typeLabel =
                yaku.Src === 'NagashiMangan'
                  ? ''
                  : yaku.Type === ScoringType.SCORING_TYPE_YAKUMAN
                    ? t('result.yakuman')
                    : t('result.han', { count: yaku.Val });
              const isRevealed = globalIdx < visibleYakuCount;
              return (
                <div
                  key={idx}
                  className={`bg-white/[0.08] border border-white/15 rounded-[6px] px-2 py-0.75 sm:px-2.5 sm:py-1 flex items-center justify-between gap-1 lg:gap-1.5 transition-all duration-500 ease-out transform ${
                    isRevealed
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  <span className="text-[#ddd] truncate flex-1 text-left">
                    {t(`yaku.${yaku.Src ?? ''}`, {
                      defaultValue: yaku.Src ?? '',
                    })}
                  </span>
                  <span className="text-[#ffaa44] font-bold">{typeLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
