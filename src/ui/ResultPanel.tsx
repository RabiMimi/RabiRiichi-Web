import React from 'react';
import {
  useRoom,
  useCurrentInquiry,
  useIsWaitingForProceed,
  useActionTimeout,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Tile } from '../domain/tile';
import { getTileTexturePath, MIMI_PATH } from '../scene/assets';
import { type ActionOption } from '../domain/inquiry';
import { ScoringType } from '../proto';
import { Logger } from '../lib/logger';
import { proceedReplay } from '../dev/replayDriver';

const logger = new Logger('ResultPanel');

export function ResultPanel(): React.JSX.Element | null {
  const room = useRoom();
  const currentInquiry = useCurrentInquiry();
  const isWaitingForProceed = useIsWaitingForProceed();
  const actionTimeout = useActionTimeout();

  const [localSecondsLeft, setLocalSecondsLeft] = React.useState<number>(8);

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
    return room ? room.players.filter((p) => p.gameState?.agari) : [];
  }, [room]);

  const winner = React.useMemo(() => {
    return room
      ? room.players.find((p) => p.gameState?.agari?.scores != null)
      : undefined;
  }, [room]);

  const isDraw = !winner;

  const proceedAction = React.useMemo(() => {
    return currentInquiry?.mapped.buttons.find(
      (b) => b.type === 'skip' || b.type === 'ryuukyoku',
    );
  }, [currentInquiry]);

  const canProceed = proceedAction != null || isWaitingForProceed;

  const handleProceed = React.useCallback(() => {
    if (proceedAction) {
      void submitAction(proceedAction);
    } else if (isWaitingForProceed) {
      proceedReplay();
    }
  }, [proceedAction, isWaitingForProceed, submitAction]);

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

  const secondsLeft = currentInquiry ? actionTimeout : localSecondsLeft;

  if (!room || playersWithResult.length === 0) return null;

  const renderWinnerDetails = (player: (typeof room.players)[0]) => {
    const agari = player.gameState?.agari;
    if (!agari?.scores) return null;

    const { items, result } = agari.scores;
    const yakuList = items ?? [];

    let summaryText = '';
    if (result) {
      if (result.yakuman && result.yakuman > 0) {
        summaryText = `${result.yakuman > 1 ? result.yakuman + '倍' : ''}役满 / Yakuman`;
      } else {
        summaryText = `${result.fu} 符 ${result.han} 番 / ${result.fu} Fu ${result.han} Han`;
      }
    }

    const handTiles = player.gameState?.hand.freeTiles ?? [];
    const calledMelds = player.gameState?.hand.called ?? [];

    return (
      <div key={player.id} className="winner-details-card">
        <div className="winner-name-row">
          <span className="winner-badge">和牌者 / Winner</span>
          <span className="winner-name">{player.nickname}</span>
          <span className="winner-summary">{summaryText}</span>
        </div>

        {/* Display final sorted hand tiles */}
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
              <span className="winning-tile-label">胡 / Win:</span>
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

        {/* List of Yaku */}
        <div className="yaku-list">
          {yakuList.map((yaku, idx) => {
            if (yaku.Type === ScoringType.SCORING_TYPE_FU) return null; // Skip Fu entries in the list
            const typeLabel =
              yaku.Type === ScoringType.SCORING_TYPE_YAKUMAN
                ? '役满'
                : `${yaku.Val}番`;
            return (
              <div key={idx} className="yaku-item">
                <span className="yaku-name">{yaku.Src}</span>
                <span className="yaku-val">{typeLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderScoreChanges = () => {
    return (
      <div className="result-score-changes">
        <h3>点数收支 / Score Changes</h3>
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
                <span className="player-name">{p.nickname}</span>
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
      <div className="result-panel">
        <h2 className="result-title">
          {isDraw ? '流局 / Draw' : '和牌 / Agari'}
        </h2>

        {/* Background art element */}
        <img src={MIMI_PATH} alt="mimi-avatar" className="result-mimi-art" />

        <div className="result-winners-container">
          {playersWithResult
            .filter((p) => p.gameState?.agari?.scores != null)
            .map((w) => renderWinnerDetails(w))}
        </div>

        {/* Score changes panel */}
        {renderScoreChanges()}

        {/* Proceed button */}
        <div className="result-actions">
          <button
            className="ui-button primary-button"
            onClick={handleProceed}
            disabled={!canProceed}
          >
            {canProceed
              ? `确定 / Confirm (${secondsLeft}s)`
              : '等待下一局... / Waiting...'}
          </button>
        </div>
      </div>
    </div>
  );
}
