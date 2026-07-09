import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useSelf,
  useIsCameraLocked,
  useAnimationSpeed,
  useIsReplayPaused,
  useReplayProgress,
  useReplayTotal,
} from '../state/store';
import { rabiriichi } from '../net/client';
import {
  togglePause,
  stepReplay,
  stopReplay,
  setReplayPerspective,
  seekToEvent,
  getCurrentRoundIndex,
  jumpToRound,
  getRoundStartIndices,
} from '../replay/replayDriver';
import { GameInfoPanel } from './GamePlayHUD';
import { FullscreenButton } from './FullscreenButton';
import { GameInfoModal } from './GameInfoModal';

export function ReplayHUD(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentUser = useSelf();
  const isCameraLocked = useIsCameraLocked();
  const animationSpeed = useAnimationSpeed();
  const isPaused = useIsReplayPaused();
  const progress = useReplayProgress();
  const total = useReplayTotal();

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isForceCollapsed, setIsForceCollapsed] = useState(false);

  const currentRoundIdx = getCurrentRoundIndex();
  const roundStartIndices = getRoundStartIndices();
  const hasPrevRound = currentRoundIdx > 0;
  const hasNextRound = currentRoundIdx < roundStartIndices.length - 1;

  const getRoundText = () => {
    if (!room?.info) return '';
    const { round, dealer, honba } = room.info;
    const winds = ['east', 'south', 'west', 'north'];
    const windKey = winds[round % 4] ?? 'east';
    const windText = t(`hud.${windKey}`);
    return t('hud.roundInfoTemplate', {
      wind: windText,
      round: dealer + 1,
      honba: honba,
    });
  };

  if (!room || !currentUser) {
    return null;
  }

  const players = room.players;

  return (
    <div className="game-play-hud replay-hud">
      {/* Left HUD Panel */}
      <div className="left-hud-panel">
        <GameInfoPanel />

        {/* Speed Settings (copied from GamePlayHUD settings-panel) */}
        <div className="settings-panel">
          <label
            htmlFor="speed-select"
            style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#aaa' }}
          >
            {t('hud.speed')}
          </label>
          <select
            id="speed-select"
            value={animationSpeed}
            onChange={(e) =>
              rabiriichi.setAnimationSpeed(Number(e.target.value))
            }
            style={{
              background: '#222',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="0.25">x0.25</option>
            <option value="0.5">x0.5</option>
            <option value="1">x1.0</option>
            <option value="2">x2.0</option>
            <option value="4">x4.0</option>
            <option value="8">x8.0</option>
          </select>
        </div>

        <div className="hud-buttons-row">
          <FullscreenButton />

          <button
            type="button"
            className={`info-icon-btn camera-lock-btn ${isCameraLocked ? 'is-locked' : ''}`}
            onClick={() => rabiriichi.toggleCameraLock()}
            title={isCameraLocked ? t('hud.unlockCamera') : t('hud.lockCamera')}
          >
            {isCameraLocked ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
              </svg>
            )}
          </button>

          <button
            type="button"
            className="info-icon-btn"
            onClick={() => setIsInfoOpen(true)}
            title={t('hud.gameInfo')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>

          <button
            type="button"
            className="info-icon-btn exit-btn"
            onClick={() => stopReplay()}
            title={t('hud.exitGame')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Replay Controls Toolbar (Bottom Center) */}
      <div
        className={`replay-controls-toolbar ${isForceCollapsed ? 'force-collapsed' : ''}`}
        onMouseLeave={() => setIsForceCollapsed(false)}
      >
        <div
          className="toolbar-expand-tab"
          onClick={() => setIsForceCollapsed((prev) => !prev)}
          style={{ cursor: 'pointer' }}
        >
          <span className="toolbar-expand-tab-icon">▲</span>
        </div>

        <div className="replay-slider-container">
          <span className="slider-time">
            {progress} / {total}
          </span>
          <input
            type="range"
            min="0"
            max={total}
            value={progress}
            onChange={(e) => seekToEvent(Number(e.target.value))}
            className="replay-slider"
          />
        </div>

        <div
          className="toolbar-controls-row"
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div className="playback-buttons">
            <button
              type="button"
              className="replay-btn step-backward-btn"
              onClick={() => stepReplay(-1)}
              disabled={!isPaused}
              title={t('replay.stepBackward', 'Step Backward')}
            >
              {/* Step Backward Icon (Bar + Left Triangle) */}
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                <rect x="5" y="4" width="3" height="16" />
                <polygon points="20 4 10 12 20 20 20 4" />
              </svg>
            </button>

            <button
              type="button"
              className="replay-btn play-pause-btn"
              onClick={togglePause}
              title={isPaused ? t('replay.play') : t('replay.pause')}
            >
              {isPaused ? (
                /* Play Icon */
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ) : (
                /* Pause Icon */
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="replay-btn step-forward-btn"
              onClick={() => stepReplay(1)}
              disabled={!isPaused}
              title={t('replay.stepForward', 'Step Forward')}
            >
              {/* Step Forward Icon (Right Triangle + Bar) */}
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                <polygon points="4 4 14 12 4 20 4 4" />
                <rect x="16" y="4" width="3" height="16" />
              </svg>
            </button>
          </div>

          {/* Round Navigation Jumper */}
          <div className="round-navigation">
            <button
              type="button"
              className="replay-btn prev-round-btn"
              onClick={() => jumpToRound(currentRoundIdx - 1)}
              disabled={!hasPrevRound}
              title={t('replay.prevRound', 'Previous Round')}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <polygon points="15.41 7.41 14 6 8 12 14 18 15.41 16.59 10.83 12 15.41 7.41" />
              </svg>
            </button>
            <span className="round-navigation-label">{getRoundText()}</span>
            <button
              type="button"
              className="replay-btn next-round-btn"
              onClick={() => jumpToRound(currentRoundIdx + 1)}
              disabled={!hasNextRound}
              title={t('replay.nextRound', 'Next Round')}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <polygon points="10 6 8.59 7.41 13.17 12 8.59 16.59 10 18 16 12 10 6" />
              </svg>
            </button>
          </div>

          <div className="perspective-selector">
            <span className="perspective-label">
              {t('replay.perspective')}:
            </span>
            <div className="perspective-buttons-group">
              {players.map((p) => {
                const isCurrent = currentUser.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`perspective-btn ${isCurrent ? 'active' : ''}`}
                    onClick={() =>
                      p.seat !== undefined && setReplayPerspective(p.seat)
                    }
                  >
                    {p.nickname}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Game Info Modal */}
      <GameInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        room={room}
      />
    </div>
  );
}
