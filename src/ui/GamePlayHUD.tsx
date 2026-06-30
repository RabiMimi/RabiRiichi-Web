import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useSelf,
  useAnimationSpeed,
  useActionTimeout,
  useCurrentInquiry,
  useIsCameraLocked,
} from '../state/store';
import { ActionHUD } from './ActionHUD';
import { rabiriichi } from '../net/client';
import { UserStatus } from '../proto';
import { pollUntil } from '../lib';
import { Tile } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';
import { ConnectionStatusIndicator } from './ConnectionStatus';
import { getWindKey } from '../domain/model';
import { GameInfoModal } from './GameInfoModal';

function GameInfoPanel(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  if (!room?.info) return null;

  const { doras, round, dealer, honba, riichiStick } = room.info;

  const windKey = getWindKey(round);
  const windTranslated = t(`hud.${windKey}`);
  const roundNumber = dealer + 1;

  return (
    <div className="game-info-panel">
      <div className="round-info-section">
        <span className="round-text">
          {windTranslated}
          {t('hud.windSpace')}
          <span className="info-number">{roundNumber}</span>
          {t('hud.roundSuffix')}
        </span>
        <span className="honba-text">
          <span className="info-number">{honba}</span>
          {t('hud.honbaSuffix')}
        </span>
        {riichiStick > 0 && (
          <span className="riichi-sticks-text">
            <span className="info-number">{riichiStick}</span>
            {t('hud.riichiSuffix')}
          </span>
        )}
      </div>
      <div className="dora-section">
        <div className="dora-panel-title">{t('hud.dora')}</div>
        <div className="dora-tiles-row">
          {Array.from({ length: 5 }).map((_, idx) => {
            const doraTileMsg = idx < doras.length ? doras[idx] : null;
            let imgSrc = '/assets/hand_tiles/back.jpg';

            if (doraTileMsg?.tile) {
              const tileStr = Tile.fromByte(doraTileMsg.tile).toString();
              imgSrc = getTileTexturePath(tileStr);
            }

            return (
              <img
                key={idx}
                src={imgSrc}
                alt={doraTileMsg ? 'Dora' : 'Locked'}
                className="dora-tile-img"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GamePlayHUD(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentUser = useSelf();
  const animationSpeed = useAnimationSpeed();
  const actionTimeout = useActionTimeout();
  const isCameraLocked = useIsCameraLocked();

  const currentInquiry = useCurrentInquiry();

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExitGame = async () => {
    if (isExiting) return;

    setIsExiting(true);
    try {
      await rabiriichi.updateRoom(UserStatus.USER_STATUS_NONE);

      const success = await pollUntil(
        async () => {
          await rabiriichi.refreshMyInfo();
          return rabiriichi.self?.status === UserStatus.USER_STATUS_NONE;
        },
        { tries: 10, delayMs: 500 },
      );

      if (!success) {
        throw new Error('Failed to exit game (timeout)');
      }
    } catch (err) {
      console.error('Failed to exit game:', err);
      alert(
        t('room.leave') +
          ' failed: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsExiting(false);
    }
  };

  const onExitGame = () => {
    setShowExitConfirm(true);
  };

  if (!room?.info || !currentUser) {
    return null;
  }

  const selfPlayer = room.players.find((p) => p.id === currentUser.id);
  const selfSeat = selfPlayer?.seat;

  if (selfSeat === undefined) {
    return null;
  }

  const hasPlayTile = currentInquiry?.mapped.playTile != null;
  const timerLabel = hasPlayTile ? t('hud.discard') : t('hud.chooseAction');

  return (
    <div className="game-play-hud">
      {/* Connection Status */}
      <ConnectionStatusIndicator />

      {/* Left HUD Panel */}
      <HUDLeftPanel
        animationSpeed={animationSpeed}
        isCameraLocked={isCameraLocked}
        isExiting={isExiting}
        onExitClick={onExitGame}
        onInfoClick={() => setIsInfoOpen(true)}
      />

      {/* Countdown Timer */}
      <HUDTimer
        timerLabel={timerLabel}
        actionTimeout={actionTimeout}
        isVisible={Boolean(currentInquiry && actionTimeout > 0)}
      />

      {/* 2D Action HUD overlay buttons */}
      <ActionHUD />

      {/* Game Info Modal */}
      <GameInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        room={room}
      />

      {/* Exit Confirmation Modal */}
      <HUDExitConfirmModal
        isOpen={showExitConfirm}
        isExiting={isExiting}
        onConfirm={() => {
          setShowExitConfirm(false);
          void handleExitGame();
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}

/* Sub-components for HUD layout clean modularity */

interface HUDLeftPanelProps {
  animationSpeed: number;
  isCameraLocked: boolean;
  isExiting: boolean;
  onExitClick: () => void;
  onInfoClick: () => void;
}

function HUDLeftPanel({
  animationSpeed,
  isCameraLocked,
  isExiting,
  onExitClick,
  onInfoClick,
}: HUDLeftPanelProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="left-hud-panel">
      {/* Game Info Panel (Doras + Round Info) */}
      <GameInfoPanel />

      {/* Settings Panel */}
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
          onClick={onInfoClick}
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
          onClick={onExitClick}
          disabled={isExiting}
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
  );
}

interface HUDTimerProps {
  timerLabel: string;
  actionTimeout: number;
  isVisible: boolean;
}

function HUDTimer({ timerLabel, actionTimeout, isVisible }: HUDTimerProps): React.JSX.Element | null {
  if (!isVisible) return null;
  return (
    <div className="player-timer-overlay">
      <span className="timer-label">{timerLabel}</span>
      <span className="timer-seconds">{Math.ceil(actionTimeout)}</span>
    </div>
  );
}

interface HUDExitConfirmModalProps {
  isOpen: boolean;
  isExiting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function HUDExitConfirmModal({
  isOpen,
  isExiting,
  onConfirm,
  onCancel,
}: HUDExitConfirmModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="exit-confirm-modal-overlay">
      <div className="exit-confirm-modal-content">
        <p className="exit-confirm-message">{t('hud.confirmExit')}</p>
        <div className="exit-confirm-buttons">
          <button
            type="button"
            className="ui-button danger-button"
            onClick={onConfirm}
            disabled={isExiting}
          >
            {t('hud.confirm')}
          </button>
          <button
            type="button"
            className="ui-button secondary-button"
            onClick={onCancel}
            disabled={isExiting}
          >
            {t('hud.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
