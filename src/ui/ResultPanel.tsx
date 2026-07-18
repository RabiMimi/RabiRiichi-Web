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
  useIsReplayPaused,
  useReplayProgress,
  useCharacterId,
  useSelf,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Tile } from '../domain/tile';
import { CHARACTERS } from '../domain/character';
import { Button } from './Button';
import { type ActionOption } from '../domain/inquiry';
import type { IGameTileMsg } from '../proto';
import { FinalResultPanel } from './FinalResultPanel';
import { soundManager } from '../lib/sound';
import { SOUND_EFFECTS } from '../lib/soundEffects';
import { UiTile } from './UiTile';

import { Logger } from '../lib/logger';
import {
  proceedReplay,
  getCurrentRoundIndex,
  getRoundStartIndices,
  jumpToRound,
  stopReplay,
} from '../replay/replayDriver';
import { filterYakuListForDisplay } from '../domain/yakus';
import { getYakuVoiceLineId, getLimitName } from '../domain/resultHelpers';
import { WinnerDetailCard } from './WinnerDetailCard';
import { ScoreTransferPanel } from './ScoreTransferPanel';

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
    const tileStr = tileMsg
      ? Tile.fromByte(tileMsg.tile ?? 0).toString()
      : 'back';
    return (
      <UiTile
        key={tileMsg?.traceId ? `${keyPrefix}-${idx}` : `locked-${idx}`}
        tile={tileStr}
        size="result"
      />
    );
  });
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
  const isPaused = useIsReplayPaused();
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

  // Prefer the frozen snapshot captured at round conclusion, depending on the
  // array refs (not the whole `room`) so room-state churn can't restart the
  // reveal. The reducer preserves `roundResultPlayers` across room updates.
  const frozenResultPlayers = room?.roundResultPlayers ?? null;
  const livePlayers = room?.players ?? null;
  const resultPlayers = React.useMemo(() => {
    return frozenResultPlayers ?? livePlayers ?? [];
  }, [frozenResultPlayers, livePlayers]);

  const hasNagashiWinner = React.useMemo(() => {
    return resultPlayers.some((p) => p.gameState?.agari?.isNagashi);
  }, [resultPlayers]);

  const playersWithResult = React.useMemo(() => {
    if (hasNagashiWinner) {
      return resultPlayers.filter((p) => p.gameState?.agari?.isNagashi);
    }
    return resultPlayers.filter(
      (p) => p.gameState?.agari?.scores != null || p.gameState?.agari?.isTenpai,
    );
  }, [resultPlayers, hasNagashiWinner]);

  const hasNormalWinner = React.useMemo(() => {
    return resultPlayers.some(
      (p) => p.gameState?.agari?.scores != null && !p.gameState.agari.isNagashi,
    );
  }, [resultPlayers]);

  const isDraw = !hasNormalWinner && !hasNagashiWinner;

  // The only `room` field the reveal reads; kept as a primitive so the effect
  // need not depend on the churning `room` object.
  const scoringOption = room?.config?.scoringOption;

  // Voice & Animation states
  const [animatingPlayerIndex, setAnimatingPlayerIndex] =
    React.useState<number>(0);
  const [visibleYakuCounts, setVisibleYakuCounts] = React.useState<
    Record<number, number>
  >({});
  const [showTotals, setShowTotals] = React.useState<Record<number, boolean>>(
    {},
  );
  const [showScoreChanges, setShowScoreChanges] = React.useState(false);
  const [animationFinished, setAnimationFinished] = React.useState(false);

  const hasNextRound =
    currentInquiry?.mapped.buttons.some((b) => b.type === 'next-round') ??
    false;

  const showPanel = React.useMemo(() => {
    return (
      (playersWithResult.length > 0 || hasNextRound || isWaitingForProceed) &&
      !resultAnimation
    );
  }, [playersWithResult, hasNextRound, isWaitingForProceed, resultAnimation]);

  // Primitive id (not the `self` object) so a self refresh can't restart it.
  const currentUserId = useSelf()?.id ?? null;

  React.useEffect(() => {
    if (!showPanel) return;

    const stateRef = { active: true };
    const isActive = () => stateRef.active;

    const runAnimation = async () => {
      await Promise.resolve(); // Defer to avoid synchronous setState warnings

      if (isDraw) {
        if (isActive()) {
          setAnimatingPlayerIndex(playersWithResult.length - 1);
          setShowScoreChanges(true);
          setAnimationFinished(true);
        }
        return;
      }

      // 1. Reset states
      if (isActive()) {
        setAnimatingPlayerIndex(0);
        setVisibleYakuCounts({});
        setShowTotals({});
        setShowScoreChanges(false);
        setAnimationFinished(false);
      }

      // Wait a brief moment before starting player animations
      await new Promise((r) => setTimeout(r, 500));

      for (let pIdx = 0; pIdx < playersWithResult.length; pIdx++) {
        if (!isActive()) return;
        setAnimatingPlayerIndex(pIdx);

        // Pause slightly on card start
        await new Promise((r) => setTimeout(r, 300));

        const player = playersWithResult[pIdx];
        if (!player) continue;
        const agari = player.gameState?.agari;
        if (!agari) continue;

        const rawYakuList = agari.scores?.items ?? [];
        const yakuList = filterYakuListForDisplay(rawYakuList, scoringOption);

        // 1a. Show yaku one by one (Reveal yaku first, then play voice)
        for (let yIdx = 0; yIdx < yakuList.length; yIdx++) {
          if (!isActive()) return;

          if (isActive()) {
            setVisibleYakuCounts((prev) => ({
              ...prev,
              [pIdx]: yIdx + 1,
            }));
          }

          const yaku = yakuList[yIdx];
          if (!yaku) continue;
          const voiceId = getYakuVoiceLineId(yaku.Src ?? '', yaku.Val ?? 0);
          const voiceLine = activeCharacter.voiceLines.find(
            (v) => v.id === voiceId,
          );

          await soundManager.playVoicePromise(voiceLine?.audioUrl);
        }

        // 1b. Play limit voice & show total
        if (!isActive()) return;
        if (agari.scores?.result && !agari.isNagashi) {
          const result = agari.scores.result;
          let limitVoiceId: string | null = null;

          if (result.finalYakuman && result.finalYakuman > 0) {
            const isAotenjou =
              scoringOption != null && (scoringOption & 2) === 0;
            if (result.kazoeYakuman && result.kazoeYakuman > 0 && !isAotenjou) {
              limitVoiceId = 'kazoeYakuman';
            } else {
              const count = result.finalYakuman;
              if (count === 1) limitVoiceId = 'yakuman';
              else if (count === 2) limitVoiceId = 'doubleYakuman';
              else if (count === 3) limitVoiceId = 'tripleYakuman';
              else if (count === 4) limitVoiceId = 'quadrupleYakuman';
              else if (count === 5) limitVoiceId = 'quintupleYakuman';
              else if (count >= 6) limitVoiceId = 'miracleYakuman';
            }
          } else {
            const limit = getLimitName(
              result.han ?? 0,
              result.fu ?? 0,
              scoringOption ?? 0,
            );
            if (limit) {
              limitVoiceId = limit;
            }
          }

          if (limitVoiceId) {
            const voiceLine = activeCharacter.voiceLines.find(
              (v) => v.id === limitVoiceId,
            );
            await soundManager.playVoicePromise(voiceLine?.audioUrl);
          } else {
            await new Promise((r) => setTimeout(r, 800));
          }
        } else {
          await new Promise((r) => setTimeout(r, 800));
        }

        if (!isActive()) return;
        if (isActive()) {
          setShowTotals((prev) => ({
            ...prev,
            [pIdx]: true,
          }));
          soundManager.playEffect(SOUND_EFFECTS.result.hanReveal);
        }

        // Pause slightly before moving to the next winner
        await new Promise((r) => setTimeout(r, 600));
      }

      // 2. Show score changes
      if (!isActive()) return;
      if (isActive()) {
        setShowScoreChanges(true);
      }

      // Play final reaction voice
      if (currentUserId != null) {
        const isWinner = playersWithResult.some((p) => p.id === currentUserId);
        const finalVoiceId = isWinner ? 'win' : 'lose';
        const voiceLine = activeCharacter.voiceLines.find(
          (v) => v.id === finalVoiceId,
        );
        await soundManager.playVoicePromise(voiceLine?.audioUrl);
      }

      if (!isActive()) return;
      if (isActive()) {
        setAnimationFinished(true);
      }
    };

    void runAnimation();

    return () => {
      stateRef.active = false;
      soundManager.stopAllVoices();
    };
    // `room` is deliberately excluded: it changes on every room-state push and
    // re-including it would restart the reveal. Everything the reveal needs is
    // captured as stable values above.
  }, [
    showPanel,
    isDraw,
    playersWithResult,
    activeCharacter,
    scoringOption,
    currentUserId,
  ]);

  React.useEffect(() => {
    if (!showPanel) {
      void Promise.resolve().then(() => {
        setAnimatingPlayerIndex(0);
        setVisibleYakuCounts({});
        setShowTotals({});
        setShowScoreChanges(false);
        setAnimationFinished(false);
      });
    }
  }, [showPanel]);

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
        if (!isPaused) {
          proceedReplay();
        } else {
          jumpToRound(currentRoundIdx + 1);
        }
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
    isPaused,
    currentRoundIdx,
    roundStartIndices,
    proceedAction,
    isWaitingForProceed,
    submitAction,
    room?.gameEnded,
  ]);

  React.useEffect(() => {
    if (!isWaitingForProceed || isPaused) return;

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
  }, [isWaitingForProceed, isPaused, handleProceed]);

  const secondsLeft = currentInquiry
    ? Math.ceil(actionTimeout)
    : localSecondsLeft;

  const showUradoras = React.useMemo(() => {
    return resultPlayers.some(
      (p) => p.gameState?.agari?.scores != null && p.gameState.riichiTileId > 0,
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
      <div className="relative z-[1] flex flex-col gap-1 lg:gap-2 bg-[#1e1e1e]/70 border border-[#333] rounded-xl p-2 lg:p-3 box-border">
        <div className="flex flex-row items-center gap-1 lg:gap-2 flex-wrap">
          <span className="text-sm text-[#80deea] font-bold uppercase tracking-wider whitespace-nowrap min-w-0">
            {t('result.dora')}
          </span>
          <div className="flex flex-row items-center gap-1 lg:gap-2 flex-wrap">
            {/* Dora Indicators */}
            <div className="flex gap-0.5 lg:gap-1">
              {renderIndicatorTiles(doras, 'dora')}
            </div>

            {/* Uradora Indicators */}
            {showUradoras && uradoras.length > 0 && (
              <>
                <span className="text-[#666] text-sm font-bold select-none mx-0.5 lg:mx-1">
                  /
                </span>
                <div className="flex gap-0.5 lg:gap-1">
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

  if (!room || !showPanel) return null;

  return (
    <div className="absolute inset-0 bg-[#0a0a0a]/85 flex justify-center items-center z-[120] text-white font-sans backdrop-blur-md overflow-x-hidden">
      <div className="flex flex-row items-stretch gap-0 w-[95%] max-w-5xl max-h-[85vh] m-auto box-border z-[121] relative">
        <div className="flex-none w-24 sm:w-48 lg:w-80 relative z-[2] -mr-6 sm:-mr-12 lg:-mr-20 pointer-events-none">
          <img
            src={activeCharacter.visualUrl}
            alt={`${activeCharacter.id}-avatar`}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none opacity-95"
          />
        </div>
        <div className="flex-1 bg-[#121c32]/95 border-2 border-[#ff7a99] rounded-2xl p-2 pl-2 lg:p-4 lg:pl-16 shadow-[0_16px_48px_rgba(0,0,0,0.8),_0_0_32px_rgba(255,122,153,0.08)] backdrop-blur-[20px] flex flex-col gap-1.5 lg:gap-2.5 relative overflow-hidden box-border">
          <h2 className="relative z-[1] text-2xl lg:text-4xl font-extrabold bg-gradient-to-br from-[#ff7a99] to-[#80deea] bg-clip-text text-transparent text-center m-0 mb-0.5 tracking-wider lg:tracking-widest">
            {hasNagashiWinner
              ? t('yaku.NagashiMangan')
              : isDraw
                ? room.ryuukyokuReason
                  ? t(`result.ryuukyoku.${room.ryuukyokuReason}`, {
                      defaultValue: t('result.draw'),
                    })
                  : t('result.draw')
                : t('result.agari')}
          </h2>

          <div
            className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-1.5 lg:gap-2.5 pr-1"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="relative z-[1] flex flex-col gap-1.5 lg:gap-2.5">
              {playersWithResult.map((w, pIdx) => (
                <WinnerDetailCard
                  key={w.id}
                  player={w}
                  visibleYakuCount={visibleYakuCounts[pIdx] ?? 0}
                  showTotal={showTotals[pIdx] ?? false}
                  isCardStarted={pIdx <= animatingPlayerIndex}
                  room={room}
                />
              ))}
            </div>

            {renderDoraIndicators()}

            {/* Score changes panel */}
            <div
              className={`transition-all duration-1000 ease-out transform ${
                showScoreChanges
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-6 pointer-events-none'
              }`}
            >
              <ScoreTransferPanel resultPlayers={resultPlayers} room={room} />
            </div>
          </div>

          {/* Proceed button */}
          <div
            className={`relative z-[1] flex justify-center transition-all duration-500 ease-out transform ${
              animationFinished
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <Button
              onClick={handleProceed}
              disabled={!canProceed && !room.gameEnded}
              className="w-full min-w-[180px] lg:w-auto"
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
