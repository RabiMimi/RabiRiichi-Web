import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '../domain/tile';
import { ScoringType } from '../proto';
import type { PlayerModel, RoomModel } from '../domain/model';
import { getPlayerDisplayName } from '../domain/model';
import { filterYakuListForDisplay } from '../domain/yakus';
import { getLimitName } from '../domain/resultHelpers';
import { UiTile } from './UiTile';

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
      className={`rounded-xl flex flex-col border p-2 lg:p-3 gap-1.5 lg:gap-2 transition-all duration-700 ease-out transform ${cardStyles} ${
        isCardStarted
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-2 scale-98 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-1.5 lg:gap-3">
        <span
          className={`text-sm font-bold px-1.5 py-0.5 lg:px-3 lg:py-1 rounded-full text-white ${badgeColor}`}
        >
          {badgeText}
        </span>
        <span className="text-lg font-bold">
          {getPlayerDisplayName(player, t)}
        </span>
        {isTenpai ? (
          player.gameState?.awaitedTiles &&
          player.gameState.awaitedTiles.length > 0 && (
            <div className="ml-auto flex items-center gap-1 lg:gap-2">
              <span className="text-sm text-[#aaa] font-bold">
                {t('result.tenpaiWaits', 'Waits')}:
              </span>
              <div className="flex gap-1.5">
                {player.gameState.awaitedTiles.map((ti, idx) => {
                  const tileStr = Tile.fromByte(ti.winningTile).toString();
                  return <UiTile key={idx} tile={tileStr} size="result" />;
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
                className={`text-sm font-bold px-1.5 py-0.5 lg:px-3 lg:py-1 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] ${finalLimitClass}`}
              >
                {limitLabel}
              </span>
            )}
            {hanFuLabel && (
              <span className={`font-bold text-lg ${finalHanFuColor}`}>
                {hanFuLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {isNagashi ? (
        <div className="flex flex-col gap-2 bg-[#141414]/40 p-3 rounded-md">
          <span className="text-xs text-[#88a8cc] uppercase font-bold">
            {t('result.river')}
          </span>
          <div className="flex flex-wrap gap-0.5 lg:gap-1">
            {(player.gameState?.hand.discarded ?? []).map((tileMsg, idx) => {
              const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
              return (
                <UiTile
                  key={tileMsg.traceId ?? idx}
                  tile={tileStr}
                  size="result"
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-0.5 lg:gap-1 bg-[#1a1a1a] p-1 lg:p-1.5 rounded-md items-center">
          <div className="flex gap-0.5 lg:gap-1">
            {handTiles.map((tileMsg, idx) => {
              const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
              return (
                <UiTile
                  key={tileMsg.traceId ?? idx}
                  tile={tileStr}
                  size="result"
                />
              );
            })}
          </div>
          {/* Winning tile */}
          {agari.incoming && (
            <div className="ml-2 lg:ml-3 border-l-2 border-zinc-700 pl-2 lg:pl-3 flex items-center">
              <div className="relative flex">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ff7a99] text-[#fff] text-xs font-black px-1.5 py-0.5 rounded-sm leading-none z-[2] select-none border border-[#ffccd5] whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                  {t('result.winTile')}
                </span>
                <UiTile
                  tile={Tile.fromByte(agari.incoming.tile ?? 0).toString()}
                  isWinningTile
                  size="result"
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
                    <UiTile
                      key={tile.traceId ?? tileIdx}
                      tile={tileStr}
                      size="result"
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          {/* Column 1 */}
          <div className="flex flex-col gap-1.5">
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
                    className={`bg-white/[0.08] border border-white/15 rounded-[6px] px-2 py-0.75 flex items-center justify-between gap-1 transition-all duration-500 ease-out transform ${
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
          <div className="flex flex-col gap-1.5">
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
                  className={`bg-white/[0.08] border border-white/15 rounded-[6px] px-2 py-0.75 flex items-center justify-between gap-1 transition-all duration-500 ease-out transform ${
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
