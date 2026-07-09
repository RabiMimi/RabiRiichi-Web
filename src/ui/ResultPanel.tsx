import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useCurrentInquiry,
  useIsWaitingForProceed,
  useActionTimeout,
  useResultAnimation,
  useHasInMemoryResult,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Tile } from '../domain/tile';
import { getTileTexturePath, MIMI_PATH } from '../scene/assets';
import { type ActionOption } from '../domain/inquiry';
import { ScoringType } from '../proto';
import { FinalResultPanel } from './FinalResultPanel';

import { Logger } from '../lib/logger';
import { proceedReplay } from '../replay/replayDriver';
import { getPlayerDisplayName } from '../domain/model';
import { filterYakuListForDisplay } from '../domain/yakus';

function getLimitName(han: number, fu: number, scoringOption: number): string | null {
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

  const [localSecondsLeft, setLocalSecondsLeft] = React.useState<number>(8);
  const [showFinalResults, setShowFinalResults] = React.useState(false);

  const handleReturnToRoom = React.useCallback(() => {
    setShowFinalResults(false);
    rabiriichi.returnToRoom();
  }, []);

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

  const playersWithResult = React.useMemo(() => {
    return room
      ? room.players.filter(
          (p) =>
            p.gameState?.agari?.scores != null || p.gameState?.agari?.isTenpai,
        )
      : [];
  }, [room]);

  const hasNagashiWinner = React.useMemo(() => {
    return room?.players.some((p) => p.gameState?.agari?.isNagashi) ?? false;
  }, [room]);

  const hasNormalWinner = React.useMemo(() => {
    return (
      room?.players.some(
        (p) =>
          p.gameState?.agari?.scores != null && !p.gameState.agari.isNagashi,
      ) ?? false
    );
  }, [room]);

  const isDraw = !hasNormalWinner;

  const proceedAction = React.useMemo(() => {
    return currentInquiry?.mapped.buttons.find(
      (b) =>
        b.type === 'next-round' || b.type === 'skip' || b.type === 'ryuukyoku',
    );
  }, [currentInquiry]);

  const canProceed = proceedAction != null || isWaitingForProceed;

  const handleProceed = React.useCallback(() => {
    if (proceedAction) {
      void submitAction(proceedAction);
    } else if (isWaitingForProceed) {
      proceedReplay();
    } else if (room?.gameEnded) {
      setShowFinalResults(true);
    }
  }, [proceedAction, isWaitingForProceed, submitAction, room?.gameEnded]);

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
      room?.players.some(
        (p) => p.gameState?.agari?.scores != null && p.gameState.riichiTileId > 0,
      ) ?? false
    );
  }, [room?.players]);

  const renderDoraIndicators = () => {
    if (isDraw || !room?.info) return null;

    const doraCount = room.info.revealedDoraCount;
    const doras = room.info.doras ?? [];
    const uradoras = room.info.uradoras ?? [];

    if (doras.length === 0) return null;

    return (
      <div className="result-dora-indicators-section">
        <div className="dora-indicator-row">
          <span className="dora-row-label">{t('result.dora')}</span>
          <div className="dora-indicator-tiles-container">
            {/* Dora Indicators */}
            <div className="dora-indicator-tiles">
              {Array.from({ length: 5 }).map((_, idx) => {
                const tileMsg = doras[idx];
                const isRevealed = idx < doraCount;
                if (isRevealed && tileMsg) {
                  const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
                  return (
                    <img
                      key={`dora-${idx}`}
                      src={getTileTexturePath(tileStr)}
                      alt={tileStr}
                      className="result-tile-img"
                    />
                  );
                }
                return (
                  <img
                    key={`dora-${idx}`}
                    src={getTileTexturePath('back')}
                    alt="back"
                    className="result-tile-img"
                  />
                );
              })}
            </div>

            {/* Uradora Indicators */}
            {showUradoras && uradoras.length > 0 && (
              <>
                <span className="dora-separator">/</span>
                <div className="dora-indicator-tiles">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const tileMsg = uradoras[idx];
                    const isRevealed = idx < doraCount;
                    if (isRevealed && tileMsg) {
                      const tileStr = Tile.fromByte(
                        tileMsg.tile ?? 0,
                      ).toString();
                      return (
                        <img
                          key={`uradora-${idx}`}
                          src={getTileTexturePath(tileStr)}
                          alt={tileStr}
                          className="result-tile-img"
                        />
                      );
                    }
                    return (
                      <img
                        key={`uradora-${idx}`}
                        src={getTileTexturePath('back')}
                        alt="back"
                        className="result-tile-img"
                      />
                    );
                  })}
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
    hasNextRound && !hasInMemoryResult && !isWaitingForProceed;

  if (room && isAwaitingNextRound) {
    return (
      <div className="next-round-waiting">
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

    let summaryText = '';
    if (isNagashi) {
      summaryText = t('result.mangan');
    } else if (isTenpai) {
      summaryText = '';
    } else if (agari.scores?.result) {
      const result = agari.scores.result;
      const isAotenjou =
        room.config?.scoringOption != null &&
        (room.config.scoringOption & 2) === 0;

      if (result.yakuman && result.yakuman > 0) {
        if (result.kazoeYakuman && result.kazoeYakuman > 0 && !isAotenjou) {
          const limitText = t('result.yakuman');
          summaryText = t('result.limitPrefixedHanOnly', {
            limit: limitText,
            han: result.han,
          });
        } else {
          if (result.yakuman > 1) {
            const key = `result.multipleYakuman_${result.yakuman}`;
            summaryText = t(key, {
              defaultValue: t('result.multipleYakuman', { count: result.yakuman }),
            });
          } else {
            summaryText = t('result.yakuman');
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
          const limitText = t(`result.${limit}`);
          summaryText = t('result.limitPrefixed', {
            limit: limitText,
            han: result.han,
            fu: result.fu,
          });
        } else {
          summaryText = t('result.fuAndHan', { fu: result.fu, han: result.han });
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

    return (
      <div
        key={player.id}
        className={`winner-details-card ${isNagashi ? 'nagashi-card' : ''}`}
      >
        <div className="winner-name-row">
          <span className="winner-badge">{badgeText}</span>
          <span className="winner-name">{getPlayerDisplayName(player, t)}</span>
          {isTenpai ? (
            player.gameState?.awaitedTiles &&
            player.gameState.awaitedTiles.length > 0 && (
              <div className="result-tenpai-waits-header">
                <span className="tenpai-waits-label">
                  {t('result.tenpaiWaits', 'Waits')}:
                </span>
                <div className="tenpai-waits-tiles">
                  {player.gameState.awaitedTiles.map((ti, idx) => {
                    const tileStr = Tile.fromByte(ti.winningTile).toString();
                    return (
                      <img
                        key={idx}
                        src={getTileTexturePath(tileStr)}
                        alt={tileStr}
                        className="result-tile-img-small"
                      />
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <span className="winner-summary">{summaryText}</span>
          )}
        </div>

        {isNagashi ? (
          <div className="winner-river-tiles">
            <span className="river-label">{t('result.river')}</span>
            <div className="river-tiles-grid">
              {(player.gameState?.hand.discarded ?? []).map((tileMsg, idx) => {
                const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
                return (
                  <img
                    key={tileMsg.traceId ?? idx}
                    src={getTileTexturePath(tileStr)}
                    alt={tileStr}
                    className="result-tile-img"
                  />
                );
              })}
            </div>
          </div>
        ) : (
          /* Display final sorted hand tiles */
          <div className="winner-hand-tiles">
            <div className="closed-hand-tiles">
              {handTiles.map((tileMsg, idx) => {
                const tileStr = Tile.fromByte(tileMsg.tile ?? 0).toString();
                return (
                  <img
                    key={tileMsg.traceId ?? idx}
                    src={getTileTexturePath(tileStr)}
                    alt={tileStr}
                    className="result-tile-img"
                  />
                );
              })}
            </div>
            {/* Winning tile */}
            {agari.incoming && (
              <div className="winning-tile-group">
                <span className="winning-tile-label">
                  {t('result.winTile')}:
                </span>
                <img
                  src={getTileTexturePath(
                    Tile.fromByte(agari.incoming.tile ?? 0).toString(),
                  )}
                  alt="winning-tile"
                  className="result-tile-img winning-tile"
                />
              </div>
            )}
            {/* Called melds */}
            {calledMelds.map((meld, meldIdx) => {
              const tiles = meld.tiles ?? [];
              return (
                <div key={meldIdx} className="result-meld-group">
                  {tiles.map((tile, tileIdx) => {
                    const tileStr = Tile.fromByte(tile.tile ?? 0).toString();
                    return (
                      <img
                        key={tile.traceId ?? tileIdx}
                        src={getTileTexturePath(tileStr)}
                        alt={tileStr}
                        className="result-tile-img"
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
          <div className="yaku-list">
            {yakuList.map((yaku, idx) => {
              if (yaku.Type === ScoringType.SCORING_TYPE_FU) return null; // Skip Fu entries in the list
              const typeLabel =
                yaku.Type === ScoringType.SCORING_TYPE_YAKUMAN
                  ? t('result.yakuman')
                  : t('result.han', { count: yaku.Val });
              return (
                <div key={idx} className="yaku-item">
                  <span className="yaku-name">
                    {t(`yaku.${yaku.Src ?? ''}`, {
                      defaultValue: yaku.Src ?? '',
                    })}
                  </span>
                  <span className="yaku-val">{typeLabel}</span>
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
      <div className="result-score-changes">
        <div className="score-changes-list">
          {room.players.map((p) => {
            const agari = p.gameState?.agari;
            const delta = (agari?.gainPoints ?? 0) - (agari?.losePoints ?? 0);
            const deltaClass =
              delta > 0 ? 'plus' : delta < 0 ? 'minus' : 'zero';
            const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
            const currentPoints =
              p.gameState?.points ??
              room.config?.pointThreshold?.initialPoints ??
              25000;
            const prevPoints = currentPoints - delta;

            return (
              <div key={p.id} className="score-change-row">
                <span className="player-name">
                  {getPlayerDisplayName(p, t)}
                </span>
                <span className="points-transition">
                  {prevPoints} → {currentPoints}
                </span>
                <span className={`points-delta ${deltaClass}`}>
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
    <div className="result-overlay">
      <div className="result-layout-container">
        <div className="result-character-side">
          <img
            src={MIMI_PATH}
            alt="mimi-avatar"
            className="result-mimi-side-art"
          />
        </div>
        <div className="result-panel">
          <h2 className="result-title">
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

          <div className="result-content-scrollable">
            <div className="result-winners-container">
              {playersWithResult.map((w) => renderWinnerDetails(w))}
            </div>

            {renderDoraIndicators()}

            {/* Score changes panel */}
            {renderScoreChanges()}
          </div>

          {/* Proceed button */}
          <div className="result-actions">
            <button
              className="ui-button primary-button"
              onClick={handleProceed}
              disabled={!canProceed && !room?.gameEnded}
            >
              {room?.gameEnded
                ? t('result.showFinalResults', 'Show Game Results')
                : canProceed
                  ? t('result.confirmWithTime', { seconds: secondsLeft })
                  : t('result.waitingForNext')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
