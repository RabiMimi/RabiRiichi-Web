import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useCurrentInquiry,
  useIsWaitingForProceed,
  useActionTimeout,
  useResultAnimation,
  useHasInMemoryResult,
  useIsReplay,
  useReplayProgress,
  useCharacterId,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Tile } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';
import { CHARACTERS } from '../domain/character';
import { Button } from './Button';
import { type ActionOption } from '../domain/inquiry';
import { ScoringType } from '../proto';
import type { IGameTileMsg } from '../proto';
import { FinalResultPanel } from './FinalResultPanel';

import { Logger } from '../lib/logger';
import {
  proceedReplay,
  getCurrentRoundIndex,
  getRoundStartIndices,
  jumpToRound,
  stopReplay,
} from '../replay/replayDriver';
import { getPlayerDisplayName } from '../domain/model';
import { filterYakuListForDisplay } from '../domain/yakus';

const LIMIT_BADGE_STYLES: Record<string, string> = {
  'limit-mangan': 'bg-[#ff7a99]',
  'limit-haneman': 'bg-[#8c7aff]',
  'limit-baiman': 'bg-[#ffb830]',
  'limit-sanbaiman': 'bg-[#ff6e30]',
  'limit-yakuman': 'bg-[#ff3333]',
};

/**
 * Renders a fixed 5-wide indicator row for the settlement screen: each tile the
 * server supplied shows its face; the remaining slots show tile backs. The
 * server list is the single source of truth for which indicators apply, so no
 * count or timing logic is re-derived here.
 */
function renderIndicatorTiles(
  tiles: IGameTileMsg[],
  keyPrefix: string,
): React.JSX.Element[] {
  return Array.from({ length: 5 }).map((_, idx) => {
    const tileMsg = tiles[idx];
    if (tileMsg) {
      const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
      return (
        <img
          key={`${keyPrefix}-${idx}`}
          src={getTileTexturePath(tileStr)}
          alt={tileStr}
          className="w-8 h-[42px] rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        />
      );
    }
    return (
      <img
        key={`${keyPrefix}-${idx}`}
        src={getTileTexturePath('back')}
        alt="back"
        className="w-8 h-[42px] rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      />
    );
  });
}

function getLimitName(
  han: number,
  fu: number,
  scoringOption: number,
): string | null {
  if (han >= 11) return 'sanbaiman';
  if (han >= 8) return 'baiman';
  if (han >= 6) return 'haneman';
  if (han >= 5) return 'mangan';

  const hasKiriage = (scoringOption & 1) !== 0;
  let score = fu * (1 << (han + 2));
  if (hasKiriage && score > 1900 && score < 2000) {
    score = 2000;
  }
  if (score >= 2000) {
    return 'mangan';
  }

  return null;
}

const logger = new Logger('ResultPanel');

export function ResultPanel(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentInquiry = useCurrentInquiry();
  const isWaitingForProceed = useIsWaitingForProceed();
  const actionTimeout = useActionTimeout();
  const resultAnimation = useResultAnimation();
  const hasInMemoryResult = useHasInMemoryResult();
  const isReplay = useIsReplay();
  const progress = useReplayProgress();
  const characterId = useCharacterId();
  const activeCharacter = React.useMemo(() => {
    const found = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
    if (!found) {
      throw new Error(
        `Character ${characterId} not found and no fallback available`,
      );
    }
    return found;
  }, [characterId]);

  const currentRoundIdx = React.useMemo(() => {
    void progress; // Reference to satisfy react-hooks/exhaustive-deps
    return isReplay ? getCurrentRoundIndex() : 0;
  }, [isReplay, progress]);

  const roundStartIndices = React.useMemo(() => {
    return isReplay ? getRoundStartIndices() : [];
  }, [isReplay]);

  const [localSecondsLeft, setLocalSecondsLeft] = React.useState<number>(8);
  const [showFinalResults, setShowFinalResults] = React.useState(false);

  const handleReturnToRoom = React.useCallback(() => {
    setShowFinalResults(false);
    if (isReplay) {
      stopReplay();
    } else {
      rabiriichi.returnToRoom();
    }
  }, [isReplay]);

  const submitAction = React.useCallback(
    async (action: ActionOption, choice?: number) => {
      try {
        await rabiriichi.submitInquiryResponse(action, choice);
      } catch (err) {
        logger.error('Failed to submit proceed/confirm action:', err);
      }
    },
    [],
  );

  // The round result is a static snapshot: prefer the frozen players captured
  // when the round concluded so the settlement never changes if someone leaves
  // the room while it is shown. Falls back to live players before the freeze.
  const resultPlayers = React.useMemo(() => {
    return room?.roundResultPlayers ?? room?.players ?? [];
  }, [room]);

  const playersWithResult = React.useMemo(() => {
    return resultPlayers.filter(
      (p) => p.gameState?.agari?.scores != null || p.gameState?.agari?.isTenpai,
    );
  }, [resultPlayers]);

  const hasNagashiWinner = React.useMemo(() => {
    return resultPlayers.some((p) => p.gameState?.agari?.isNagashi);
  }, [resultPlayers]);

  const hasNormalWinner = React.useMemo(() => {
    return resultPlayers.some(
      (p) => p.gameState?.agari?.scores != null && !p.gameState.agari.isNagashi,
    );
  }, [resultPlayers]);

  const isDraw = !hasNormalWinner;

  const proceedAction = React.useMemo(() => {
    return currentInquiry?.mapped.buttons.find(
      (b) =>
        b.type === 'next-round' || b.type === 'skip' || b.type === 'ryuukyoku',
    );
  }, [currentInquiry]);

  const canProceed = isReplay
    ? true
    : proceedAction != null || isWaitingForProceed;

  const handleProceed = React.useCallback(() => {
    if (isReplay) {
      if (currentRoundIdx < roundStartIndices.length - 1) {
        jumpToRound(currentRoundIdx + 1);
      } else {
        setShowFinalResults(true);
      }
      return;
    }
    if (proceedAction) {
      void submitAction(proceedAction);
    } else if (isWaitingForProceed) {
      proceedReplay();
    } else if (room?.gameEnded) {
      setShowFinalResults(true);
    }
  }, [
    isReplay,
    currentRoundIdx,
    roundStartIndices,
    proceedAction,
    isWaitingForProceed,
    submitAction,
    room?.gameEnded,
  ]);

  React.useEffect(() => {
    if (!isWaitingForProceed) return;

    const intervalId = setInterval(() => {
      setLocalSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          handleProceed();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
      setLocalSecondsLeft(8);
    };
  }, [isWaitingForProceed, handleProceed]);

  const secondsLeft = currentInquiry
    ? Math.ceil(actionTimeout)
    : localSecondsLeft;

  const hasNextRound =
    currentInquiry?.mapped.buttons.some((b) => b.type === 'next-round') ??
    false;

  const showUradoras = React.useMemo(() => {
    return (
      resultPlayers.some(
        (p) =>
          p.gameState?.agari?.scores != null && p.gameState.riichiTileId > 0,
      ) ?? false
    );
  }, [resultPlayers]);

  const renderDoraIndicators = () => {
    if (isDraw || !room?.info) return null;

    // The server's ConcludeGameEvent already contains exactly the indicators
    // that apply to this settlement (e.g. an open-kan's new dora is excluded for
    // a ron winner). Render those lists verbatim — never re-derive which are
    // revealed on the client.
    const { doras, uradoras } = room.info;
    if (doras.length === 0) return null;

    return (
      <div className="relative z-[1] flex flex-col gap-3 bg-[#1e1e1e]/70 border border-[#333] rounded-[10px] p-4 box-border">
        <div className="flex flex-row items-center gap-3 flex-wrap">
          <span className="text-sm text-[#80deea] font-bold uppercase tracking-[1px] whitespace-nowrap min-w-[135px]">
            {t('result.dora')}
          </span>
          <div className="flex flex-row items-center gap-3 flex-wrap">
            {/* Dora Indicators */}
            <div className="flex gap-1.5">
              {renderIndicatorTiles(doras, 'dora')}
            </div>

            {/* Uradora Indicators */}
            {showUradoras && uradoras.length > 0 && (
              <>
                <span className="text-[#666] text-[1.4rem] font-bold select-none mx-1">
                  /
                </span>
                <div className="flex gap-1.5">
                  {renderIndicatorTiles(uradoras, 'uradora')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // On reconnect the server re-pushes the next-round ack but the snapshot has no
  // finished-round result to display. The client auto-acks it (see client.ts);
  // meanwhile show a small notice rather than an empty result overlay.
  const isAwaitingNextRound =
    !isReplay && hasNextRound && !hasInMemoryResult && !isWaitingForProceed;

  if (room && isAwaitingNextRound) {
    return (
      <div className="absolute right-6 bottom-6 z-[120] px-4 py-2.5 rounded-xl bg-[#0a0a0a]/75 text-white font-sans text-sm shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-[4px]">
        {t('result.waitingForNextRound')}
      </div>
    );
  }

  if (showFinalResults) {
    return <FinalResultPanel onReturnToRoom={handleReturnToRoom} />;
  }

  const showPanel =
    (playersWithResult.length > 0 || hasNextRound || isWaitingForProceed) &&
    !resultAnimation;

  if (!room || !showPanel) return null;

  const renderWinnerDetails = (player: (typeof room.players)[0]) => {
    const agari = player.gameState?.agari;
    if (!agari) return null;
    if (!agari.scores && !agari.isTenpai) return null;

    const isNagashi = agari.isNagashi ?? false;
    const isTenpai = agari.isTenpai ?? false;

    let badgeText = t('result.winnerBadge');
    if (isNagashi) {
      badgeText = t('yaku.NagashiMangan');
    } else if (isTenpai) {
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
        className={`rounded-[10px] p-4 flex flex-col gap-3 border ${cardStyles}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-[0.75rem] font-bold px-2.5 py-0.75 rounded-[50px] text-white ${badgeColor}`}
          >
            {badgeText}
          </span>
          <span className="text-[1.15rem] font-bold">
            {getPlayerDisplayName(player, t)}
          </span>
          {isTenpai ? (
            player.gameState?.awaitedTiles &&
            player.gameState.awaitedTiles.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-[#aaa] font-bold">
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
                        className="w-6 h-8 rounded-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                      />
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="ml-auto flex items-center gap-2">
              {limitLabel && (
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-[50px] shadow-[0_2px_4px_rgba(0,0,0,0.2)] ${finalLimitClass}`}
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
            <span className="text-sm text-[#88a8cc] uppercase font-bold">
              {t('result.river')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(player.gameState?.hand.discarded ?? []).map((tileMsg, idx) => {
                const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
                return (
                  <img
                    key={tileMsg.traceId ?? idx}
                    src={getTileTexturePath(tileStr)}
                    alt={tileStr}
                    className="w-8 h-[42px] rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                );
              })}
            </div>
          </div>
        ) : (
          /* Display final sorted hand tiles */
          <div className="flex flex-wrap gap-[3px] bg-[#1a1a1a] p-2 rounded-md items-center">
            <div className="flex gap-[3px]">
              {handTiles.map((tileMsg, idx) => {
                const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
                return (
                  <img
                    key={tileMsg.traceId ?? idx}
                    src={getTileTexturePath(tileStr)}
                    alt={tileStr}
                    className="w-8 h-[42px] rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                );
              })}
            </div>
            {/* Winning tile */}
            {agari.incoming && (
              <div className="flex items-center gap-1.5 ml-3 border-l-[1.5px] border-[#444] pl-3">
                <span className="winning-tile-label">
                  {t('result.winTile')}:
                </span>
                <img
                  src={getTileTexturePath(
                    Tile.fromByte(agari.incoming.tile ?? 0).toString(),
                  )}
                  alt="winning-tile"
                  className="w-8 h-[42px] rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.5)] border-[1.5px] border-[#ff7a99]"
                />
              </div>
            )}
            {/* Called melds */}
            {calledMelds.map((meld, meldIdx) => {
              const tiles = meld.tiles ?? [];
              return (
                <div
                  key={meldIdx}
                  className="flex gap-[3px] ml-3 border-l-[1.5px] border-[#444] pl-3"
                >
                  {tiles.map((tile, tileIdx) => {
                    const tileStr = Tile.fromByte(tile.tile ?? 0).toString();
                    return (
                      <img
                        key={tile.traceId ?? tileIdx}
                        src={getTileTexturePath(tileStr)}
                        alt={tileStr}
                        className="w-8 h-[42px] rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* List of Yaku */}
        {!isNagashi && !isTenpai && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {yakuList.map((yaku, idx) => {
              const typeLabel =
                yaku.Type === ScoringType.SCORING_TYPE_YAKUMAN
                  ? t('result.yakuman')
                  : t('result.han', { count: yaku.Val });
              return (
                <div
                  key={idx}
                  className="bg-white/[0.08] border border-white/15 rounded-[6px] px-2.5 py-1 flex items-center justify-between gap-1.5"
                >
                  <span className="text-[#ddd]">
                    {t(`yaku.${yaku.Src ?? ''}`, {
                      defaultValue: yaku.Src ?? '',
                    })}
                  </span>
                  <span className="text-[#ffaa44] font-bold">{typeLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderScoreChanges = () => {
    return (
      <div className="relative z-[1] bg-[#252525]/75 border border-[#333] rounded-[10px] p-4">
        <div className="flex flex-row gap-2.5 justify-between">
          {resultPlayers.map((p) => {
            const agari = p.gameState?.agari;
            const delta = (agari?.gainPoints ?? 0) - (agari?.losePoints ?? 0);
            const deltaColor =
              delta > 0
                ? 'text-[#00ff00]'
                : delta < 0
                  ? 'text-[#ff3333]'
                  : 'text-[#888]';
            const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
            const currentPoints =
              p.gameState?.points ??
              room.config?.pointThreshold?.initialPoints ??
              25000;
            const prevPoints = currentPoints - delta;

            return (
              <div
                key={p.id}
                className="flex-1 flex flex-col items-center bg-black/20 border border-white/5 rounded-lg py-2 px-1.5 gap-1 box-border min-w-[90px]"
              >
                <span className="font-bold text-sm truncate max-w-full text-center">
                  {getPlayerDisplayName(p, t)}
                </span>
                <span className="text-[#888] text-sm font-mono">
                  {prevPoints} → {currentPoints}
                </span>
                <span
                  className={`font-bold font-mono text-lg min-w-0 text-center ${deltaColor}`}
                >
                  {deltaText}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-[#0a0a0a]/85 flex justify-center items-center z-[120] text-white font-sans backdrop-blur-md">
      <div className="flex flex-row items-stretch gap-0 w-[95%] max-w-[1000px] max-h-[85vh] m-auto box-border z-[121] relative">
        <div className="hidden md:block flex-[0_0_320px] relative z-[2] -mr-20 pointer-events-none">
          <img
            src={activeCharacter.visualUrl}
            alt={`${activeCharacter.id}-avatar`}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none opacity-95"
          />
        </div>
        <div className="flex-1 bg-[#121c32]/95 border-2 border-[#ff7a99] rounded-[20px] p-6 pl-4 md:pl-20 shadow-[0_16px_48px_rgba(0,0,0,0.8),_0_0_32px_rgba(255,122,153,0.08)] backdrop-blur-[20px] flex flex-col gap-4 relative overflow-hidden box-border">
          <h2 className="relative z-[1] text-4xl font-extrabold bg-gradient-to-br from-[#ff7a99] to-[#80deea] bg-clip-text text-transparent text-center m-0 mb-1 tracking-[4px]">
            {isDraw
              ? hasNagashiWinner
                ? t('yaku.NagashiMangan')
                : room.ryuukyokuReason
                  ? t(`result.ryuukyoku.${room.ryuukyokuReason}`, {
                      defaultValue: t('result.draw'),
                    })
                  : t('result.draw')
              : t('result.agari')}
          </h2>

          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
            <div className="relative z-[1] flex flex-col gap-4">
              {playersWithResult.map((w) => renderWinnerDetails(w))}
            </div>

            {renderDoraIndicators()}

            {/* Score changes panel */}
            {renderScoreChanges()}
          </div>

          {/* Proceed button */}
          <div className="relative z-[1] flex justify-center">
            <Button
              onClick={handleProceed}
              disabled={!canProceed && !room.gameEnded}
              className="w-full min-w-[180px] md:w-auto"
            >
              {room.gameEnded
                ? t('result.showFinalResults', 'Show Game Results')
                : isReplay
                  ? currentRoundIdx < roundStartIndices.length - 1
                    ? t('result.nextRound', 'Next Round')
                    : t('result.showFinalResults', 'Show Game Results')
                  : canProceed
                    ? t('result.confirmWithTime', { seconds: secondsLeft })
                    : t('result.waitingForNext')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
