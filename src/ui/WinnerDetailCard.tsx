import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '../domain/tile';
import type { IScoringMsg } from '../proto';
import type { PlayerModel, RoomModel } from '../domain/model';
import { YAKUMAN_HAN, getPlayerDisplayName } from '../domain/model';
import {
  filterYakuListForDisplay,
  isYakumanEnabled,
  isYakumanScoring,
} from '../domain/yakus';
import { getLimitName } from '../domain/resultHelpers';
import { UiTile } from './UiTile';
import { getGameFontStack } from './gameFont';
import { getResultBadge } from './resultBadge';
import { RESULT } from './styles';

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
  const { t, i18n } = useTranslation();
  const fontFamily = getGameFontStack(i18n.language);

  const agari = player.gameState?.agari;
  if (!agari) return null;
  if (!agari.scores && !agari.isTenpai) return null;

  const scoringOption =
    room.roundResult?.scoringOption ?? room.config?.scoringOption;
  const isAotenjou = !isYakumanEnabled(scoringOption);

  const isNagashi = agari.isNagashi ?? false;
  const isTenpai = agari.isTenpai ?? false;

  let limitLabel: string | null = null;

  if (isNagashi) {
    limitLabel = t('result.mangan');
  } else if (isTenpai) {
    // nothing
  } else if (agari.scores?.result) {
    const result = agari.scores.result;

    const effectiveHan = isAotenjou
      ? (result.han ?? 0) +
        ((result.yakuman ?? 0) + (result.bonusYakuman ?? 0)) * YAKUMAN_HAN
      : (result.han ?? 0);

    if (result.finalYakuman && result.finalYakuman > 0 && !isAotenjou) {
      if (result.kazoeYakuman && result.kazoeYakuman > 0) {
        limitLabel = t('result.yakuman');
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
        : getLimitName(effectiveHan, result.fu ?? 0, scoringOption ?? 0);

      if (limit) {
        limitLabel = t(`result.${limit}`);
      }
    }
  }

  /** Right-hand label on a yaku row. */
  const yakuTypeLabel = (yaku: IScoringMsg): string => {
    if (yaku.Src === 'NagashiMangan') {
      return '';
    }
    const isYakuman = isYakumanScoring(yaku.Type);
    if (isYakuman && !isAotenjou) {
      return t('result.yakuman');
    }
    return t('result.han', {
      count: isYakuman ? (yaku.Val ?? 1) * YAKUMAN_HAN : (yaku.Val ?? 0),
    });
  };

  const rawYakuList = agari.scores?.items ?? [];
  const yakuList = filterYakuListForDisplay(rawYakuList, scoringOption);
  const scoreResult = agari.scores?.result;
  const shouldShowHanFu = Boolean(
    scoreResult &&
    ((scoreResult.finalYakuman ?? 0) <= 0 ||
      (scoreResult.kazoeYakuman ?? 0) > 0 ||
      isAotenjou),
  );

  const handTiles = player.gameState?.hand.freeTiles ?? [];
  const calledMelds = player.gameState?.hand.called ?? [];

  const finalHanFuColor = isNagashi ? 'text-[#00e5ff]' : 'text-[#ff7a99]';

  // Reuse the existing unit-only i18n keys instead of inventing new ones.
  const hanUnit = t('hud.han'); // ' Han' / '翻' / '番'
  const fuUnit = t('yaku.fu'); // 'Fu' / '符' / '符'
  const pointsUnit = t('hud.points'); // 'pts' / '点' / '点'

  const badge = getResultBadge({ agari, t });

  return (
    <div
      key={player.id}
      className={`rounded-xl flex flex-col p-2 lg:p-3 gap-1.5 lg:gap-2 transition-all duration-700 ease-out transform ${
        isCardStarted
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-2 scale-98 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-1.5 lg:gap-3">
        <span
          className="text-sm lg:text-base font-bold text-white truncate max-w-[40%]"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {getPlayerDisplayName(player, t)}
        </span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] lg:text-xs font-bold uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>

        {isTenpai &&
          player.gameState?.awaitedTiles &&
          player.gameState.awaitedTiles.length > 0 && (
            <div className="ml-auto flex items-center gap-1 lg:gap-2 min-w-0">
              <span className="text-sm text-[#aaa] font-bold shrink-0">
                {t('result.tenpaiWaits', 'Waits')}:
              </span>
              {/* Kokushi waits on all 13 tiles, and this row shares its line
                  with the player name, so it has to be allowed to wrap. */}
              <div className="flex flex-wrap justify-end gap-1.5">
                {player.gameState.awaitedTiles.map((ti, idx) => {
                  const tileStr = Tile.fromByte(ti.winningTile).toString();
                  return <UiTile key={idx} tile={tileStr} size="result" />;
                })}
              </div>
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
        <div
          className={`grid grid-cols-2 gap-x-3 gap-y-1.5 ${RESULT.yakuRow}`}
          style={{ fontFamily }}
        >
          {/* Column 1 */}
          <div className="flex flex-col gap-1.5">
            {yakuList
              .slice(0, Math.ceil(yakuList.length / 2))
              .map((yaku, idx) => {
                const globalIdx = idx;
                const typeLabel = yakuTypeLabel(yaku);
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
                    <span className="text-[#ffaa44]">{typeLabel}</span>
                  </div>
                );
              })}
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-1.5">
            {yakuList.slice(Math.ceil(yakuList.length / 2)).map((yaku, idx) => {
              const half = Math.ceil(yakuList.length / 2);
              const globalIdx = half + idx;
              const typeLabel = yakuTypeLabel(yaku);
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
                  <span className="text-[#ffaa44]">{typeLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Han/Fu below yaku list */}
      {scoreResult && (
        <div
          className={`mt-2 flex items-baseline transition-all duration-700 ease-out transform ${
            showTotal
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-4 pointer-events-none'
          }`}
        >
          {shouldShowHanFu && (
            <>
              <span
                className={`${RESULT.scoreFigure} ${finalHanFuColor} whitespace-nowrap`}
                style={{ fontFamily }}
              >
                {scoreResult.han ?? 0}
                {hanUnit}
              </span>
              {scoreResult.fu ? (
                <span
                  className={`${RESULT.scoreFu} ${finalHanFuColor} ml-2 whitespace-nowrap`}
                  style={{ fontFamily }}
                >
                  {scoreResult.fu}
                  {fuUnit}
                </span>
              ) : null}
            </>
          )}
          <div className="flex-1" />
          <span
            className={`${RESULT.scoreFigure} ${finalHanFuColor} whitespace-nowrap`}
            style={{ fontFamily }}
          >
            {agari.gainPoints - agari.losePoints}
            {pointsUnit}
          </span>
          {limitLabel && (
            <span
              className={`${RESULT.limitLabel} ml-3 lg:ml-6 whitespace-nowrap transition-all duration-500 ease-out ${
                showTotal ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}
              style={{ fontFamily }}
            >
              {limitLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
