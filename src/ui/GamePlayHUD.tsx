import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useSelf,
  useActionTimeout,
  useCurrentInquiry,
  useIsCameraLocked,
  useHoveredTileTraceId,
  useSelectedTileTraceId,
  useIsRiichiSelectMode,
} from '../state/store';
import { ActionHUD } from './ActionHUD';
import { CallPrompt } from './CallPrompt';
import { HandDisplay } from './HandDisplay';
import { Button } from './Button';
import { useHoverOrTouchHold } from './useHoverOrTouchHold';
import { rabiriichi } from '../net/client';
import { UserStatus, FuritenType } from '../proto';
import { DEFAULT_MIN_HAN } from '../domain/constants';
import { isYakumanEnabled } from '../domain/yakus';
import { pollUntil } from '../lib';
import { Tile, checkDiscardResultsInFuriten } from '../domain/tile';
import { getPlayerDiscardsFromRegistry } from '../domain/tileRegistry';
import { ConnectionStatusIndicator } from './ConnectionStatus';
import { UiTile } from './UiTile';
import { getTimerDigitPath } from './timerDigits';
import { HUD } from './styles';
import {
  getWindKey,
  waitMeetsMinHan,
  riichiBonusHan,
  displayHan,
  type MappedTenpaiInfo,
  totalYakuman,
} from '../domain/model';
import { findActiveDiscardCandidate } from '../domain/inquiry';
import { GameInfoModal } from './GameInfoModal';
import { FullscreenButton } from './FullscreenButton';
import { Tooltip } from './Tooltip';
import { SettingsButton } from './SettingsButton';
import { IconButton } from './IconButton';
import { AutoPlayControls } from './AutoPlayControls';

export function GameInfoPanel(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  if (!room?.info) return null;

  const { doras, round, dealer, honba, riichiStick } = room.info;

  const windKey = getWindKey(round);
  const windTranslated = t(`hud.${windKey}`);
  const roundNumber = dealer + 1;

  return (
    // Always fully opaque. This is reference information the player reads at a
    // glance, so making them hover it to see it clearly only got in the way --
    // and every sibling panel in the same column is already undimmed. The tab
    // stop went with the dimming: it existed solely so focus-within could
    // reveal the panel, and the panel is not interactive.
    <div className="bg-[#141414]/85 border-[1.5px] border-[#444] rounded-lg py-2 px-3 flex flex-col gap-2 text-white pointer-events-auto shadow-[0_4px_12px_rgba(0,0,0,0.5)] min-w-[180px]">
      <div className="flex justify-center items-center gap-4 border-b border-[#333] pb-[6px] text-sm font-bold">
        <span className="text-[#ccc] flex items-center">
          {windTranslated}
          {t('hud.windSpace')}
          <span className="text-[#80deea] text-[1.05rem] font-extrabold mx-[2px] [text-shadow:0_0_4px_rgba(128,222,234,0.3)]">
            {roundNumber}
          </span>
          {t('hud.roundSuffix')}
        </span>
        <span className="text-[#ccc] flex items-center">
          <span className="text-[#80deea] text-[1.05rem] font-extrabold mx-[2px] [text-shadow:0_0_4px_rgba(128,222,234,0.3)]">
            {honba}
          </span>
          {t('hud.honbaSuffix')}
        </span>
        {riichiStick > 0 && (
          <span className="text-[#ff3333] bg-white/95 py-[1px] px-[6px] rounded text-[0.7rem] border-[1.5px] border-[#ff3333] font-extrabold shadow-[0_1px_3px_rgba(0,0,0,0.3)] flex items-center">
            <span className="text-[#ff3333] text-sm font-extrabold m-0">
              {riichiStick}
            </span>
            {t('hud.riichiSuffix')}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-xs font-bold text-[#80deea] tracking-[2px]">
          {t('hud.dora')}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, idx) => {
            const doraTileMsg = idx < doras.length ? doras[idx] : null;
            const tileStr = doraTileMsg?.tile
              ? Tile.fromByte(doraTileMsg.tile).toString()
              : 'back';

            return <UiTile key={idx} tile={tileStr} size="dora" />;
          })}
        </div>
      </div>
    </div>
  );
}

interface TenpaiWaitPanelProps {
  awaitedTiles: MappedTenpaiInfo[];
  className?: string;
  /** Minimum yaku han required to win (番缚), from game config. */
  minHan?: number;
  /** Table scoring rules; without them aotenjou waits mislabel as 役満. */
  scoringOption?: number | null;
  /**
   * Extra guaranteed yaku han for these waits, on top of the server-reported
   * yaku floor. Set to 1 for riichi-button candidates (declaring riichi adds a
   * guaranteed yaku); 0 for normal discard previews.
   */
  bonusYaku?: number;
  isFuriten?: boolean;
}

export function TenpaiWaitPanel({
  awaitedTiles,
  className = '',
  minHan = DEFAULT_MIN_HAN,
  scoringOption = null,
  bonusYaku = 0,
  isFuriten = false,
}: TenpaiWaitPanelProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const yakumanEnabled = isYakumanEnabled(scoringOption);
  if (awaitedTiles.length === 0) return null;

  return (
    <div
      className={`absolute bg-[#121c32]/94 border-[1.5px] border-[#ff7a99]/70 rounded-lg py-2 px-2 shadow-[0_4px_15px_rgba(0,0,0,0.6)] backdrop-blur-md text-white font-sans z-[100] pointer-events-none w-fit box-border ${className}`}
    >
      {isFuriten && (
        <div className="absolute -top-[9px] md:-top-[11px] left-1/2 -translate-x-1/2 bg-gradient-to-br from-[#ff0055] to-[#ff5500] text-white text-[0.6rem] md:text-xs font-bold tracking-[1px] px-1.5 py-[1px] md:px-2 md:py-[2px] rounded-full shadow-[0_0_8px_rgba(255,0,85,0.8)] whitespace-nowrap animate-[furiten-glow-pulse_1.5s_infinite_alternate] z-[101] uppercase border border-white/40">
          {t('hud.furiten')}
        </div>
      )}
      <div className="flex flex-row gap-1 sm:gap-1.5 max-w-[90vw] overflow-x-auto">
        {awaitedTiles.map((ti, idx) => {
          const tileStr = Tile.fromByte(ti.winningTile).toString();
          const yakuBound = yakumanEnabled && totalYakuman(ti) > 0;
          const meetsMinHan = waitMeetsMinHan(ti, minHan, bonusYaku);
          return (
            <div
              key={idx}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 bg-white/5 py-0.5 px-1 sm:py-1 sm:px-1.5 rounded min-w-[32px] sm:min-w-[44px] ${
                meetsMinHan ? '' : 'opacity-45'
              }`}
            >
              <UiTile
                tile={tileStr}
                size="tenpai"
                className={meetsMinHan ? '' : 'grayscale'}
              />
              <div className="flex flex-col items-center text-[9px] sm:text-[0.68rem] sm:text-xs leading-[1.1] sm:leading-[1.2]">
                <span className="text-[#ddd]">
                  {ti.remainingCount}
                  {t('hud.tilesRemaining')}
                </span>
                <span className="text-[#aaa]">
                  {!meetsMinHan ? (
                    <span className="text-[#ff5555] font-bold">
                      {ti.yakuHan + bonusYaku === 0
                        ? t('hud.yakuRequired')
                        : t('hud.minHanRequired')}
                    </span>
                  ) : yakuBound ? (
                    <span className="text-[#ff3399] font-bold">
                      {t('hud.yakuman')}
                    </span>
                  ) : (
                    <span>
                      {displayHan(ti, bonusYaku, yakumanEnabled)}
                      {t('hud.han')}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GamePlayHUD(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentUser = useSelf();
  const actionTimeout = useActionTimeout();
  const isCameraLocked = useIsCameraLocked();

  const currentInquiry = useCurrentInquiry();
  const hoveredTraceId = useHoveredTileTraceId();
  const selectedTraceId = useSelectedTileTraceId();
  const activeTraceId = hoveredTraceId ?? selectedTraceId;
  const isRiichiSelectMode = useIsRiichiSelectMode();

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showPermanentWaits, showPermanentWaitsBind] = useHoverOrTouchHold(300);

  const selfPlayer = useMemo(() => {
    if (!room || !currentUser) return null;
    return room.players.find((p) => p.id === currentUser.id) ?? null;
  }, [room, currentUser]);

  const activeDiscardCandidate = useMemo(() => {
    if (activeTraceId == null || !currentInquiry) return null;
    return findActiveDiscardCandidate(
      currentInquiry.mapped,
      activeTraceId,
      isRiichiSelectMode,
    );
  }, [activeTraceId, currentInquiry, isRiichiSelectMode]);

  const isFuriten = useMemo(() => {
    if (!selfPlayer?.gameState?.furiten) return false;
    return Object.values(selfPlayer.gameState.furiten).some(Boolean);
  }, [selfPlayer]);

  const isFuritenDiscard = useMemo(() => {
    if (
      !activeDiscardCandidate ||
      activeTraceId == null ||
      !room ||
      !selfPlayer
    ) {
      return false;
    }

    if (selfPlayer.seat === undefined) {
      return false;
    }
    const discards = getPlayerDiscardsFromRegistry(
      room.tileRegistry,
      selfPlayer.seat,
    );

    const tileMsg = room.tileRegistry.get(activeTraceId);
    if (tileMsg?.tile == null) {
      return false;
    }

    const winningWaits = activeDiscardCandidate.candidate.tenpaiInfos.map(
      (w) => w.winningTile,
    );
    const isAlreadyFuriten =
      selfPlayer.gameState?.furiten[FuritenType.FURITEN_TYPE_DISCARD] ?? false;

    return checkDiscardResultsInFuriten(
      tileMsg.tile,
      winningWaits,
      discards,
      isAlreadyFuriten,
    );
  }, [activeDiscardCandidate, activeTraceId, room, selfPlayer]);

  const minHan = room?.config?.minHan ?? DEFAULT_MIN_HAN;
  const scoringOption = room?.config?.scoringOption ?? null;
  // 2 on the first jun: declaring riichi there is a double riichi.
  const riichiBonus = riichiBonusHan(
    room?.players ?? [],
    room?.config?.allowedYakus,
  );

  const permanentAwaitedTiles = useMemo(() => {
    return selfPlayer?.gameState?.awaitedTiles ?? [];
  }, [selfPlayer]);

  const hasActionButtons = useMemo(() => {
    return Boolean(currentInquiry && currentInquiry.mapped.buttons.length > 0);
  }, [currentInquiry]);

  const hasPermanentTenpai = permanentAwaitedTiles.length > 0;

  const handleExitGame = async () => {
    if (isExiting) return;

    setIsExiting(true);
    rabiriichi.beginExitGame();
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
      rabiriichi.cancelExitGame();
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

  if (!room?.info || !currentUser || !selfPlayer) {
    return null;
  }

  const selfSeat = selfPlayer.seat;

  if (selfSeat === undefined) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[40] select-none">
      {/* Top Right HUD (Settings + Connection Status) */}
      <div className="pointer-events-auto absolute top-5 right-5 z-[50] flex items-center gap-2">
        <ConnectionStatusIndicator />
        <SettingsButton />
      </div>

      {/* Left HUD Panel */}
      <HUDLeftPanel
        isCameraLocked={isCameraLocked}
        isExiting={isExiting}
        onExitClick={onExitGame}
        onInfoClick={() => setIsInfoOpen(true)}
      />

      {/* DOM Hand Display for local player */}
      <HandDisplay />

      {/* Countdown Timer */}
      <HUDTimer
        actionTimeout={actionTimeout}
        isVisible={Boolean(currentInquiry && actionTimeout > 0)}
      />

      {/* Call flash at player positions */}
      <CallPrompt />

      {/* 2D Action HUD overlay buttons */}
      <ActionHUD />

      {/* Discard Hover Tenpai Panel */}
      {activeDiscardCandidate &&
        activeDiscardCandidate.candidate.tenpaiInfos.length > 0 && (
          <TenpaiWaitPanel
            awaitedTiles={activeDiscardCandidate.candidate.tenpaiInfos}
            minHan={minHan}
            scoringOption={scoringOption}
            bonusYaku={activeDiscardCandidate.isRiichi ? riichiBonus : 0}
            className={`absolute left-1/2 -translate-x-1/2 flex flex-col gap-1.5 ${
              hasActionButtons ? 'bottom-[30vh]' : 'bottom-[18vh]'
            }`}
            isFuriten={isFuritenDiscard}
          />
        )}

      {/* Permanent Hover Tenpai Panel (Fixed Position) */}
      {!activeDiscardCandidate &&
        showPermanentWaits &&
        permanentAwaitedTiles.length > 0 && (
          <TenpaiWaitPanel
            awaitedTiles={permanentAwaitedTiles}
            minHan={minHan}
            scoringOption={scoringOption}
            className={`absolute left-1/2 -translate-x-1/2 flex flex-col gap-1.5 ${
              hasActionButtons ? 'bottom-[30vh]' : 'bottom-[18vh]'
            }`}
            isFuriten={isFuriten}
          />
        )}

      {/* 2D Permanent Tenpai/Furiten Badge Overlay (positioned near the hand) */}
      {(hasPermanentTenpai || isFuriten) && (
        <div className="absolute bottom-[13vh] left-[calc(50%-24vw)] z-[90] flex flex-col items-center pointer-events-auto">
          <div
            className={`min-w-[36px] h-[36px] sm:min-w-[44px] sm:h-[44px] rounded-[18px] sm:rounded-[22px] px-2 sm:px-3 box-border bg-[#121c32]/85 border-2 flex items-center justify-center text-base sm:text-lg font-bold cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-200 select-none ${
              isFuriten
                ? 'border-[#cc3333] text-[#cc3333] hover:scale-110 hover:bg-[#cc3333] hover:text-white hover:shadow-[0_4px_15px_rgba(204,51,51,0.4)]'
                : 'border-[#ff7a99] text-[#ff7a99] hover:scale-110 hover:bg-[#ff7a99] hover:text-white hover:shadow-[0_4px_15px_rgba(255,122,153,0.4)]'
            }`}
            onPointerEnter={showPermanentWaitsBind.onPointerEnter}
            onPointerLeave={showPermanentWaitsBind.onPointerLeave}
            onPointerDown={showPermanentWaitsBind.onPointerDown}
            onPointerUp={showPermanentWaitsBind.onPointerUp}
            onPointerCancel={showPermanentWaitsBind.onPointerCancel}
          >
            {isFuriten ? t('hud.furiten') : t('hud.tenpai')}
          </div>
        </div>
      )}

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
  isCameraLocked: boolean;
  isExiting: boolean;
  onExitClick: () => void;
  onInfoClick: () => void;
}

function HUDLeftPanel({
  isCameraLocked,
  isExiting,
  onExitClick,
  onInfoClick,
}: HUDLeftPanelProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="absolute top-5 left-5 flex flex-col gap-3 pointer-events-none z-50">
      {/* Game Info Panel (Doras + Round Info) */}
      <GameInfoPanel />

      {/* Settings Panel */}
      <div className="flex flex-row gap-2">
        <FullscreenButton />

        <Tooltip
          content={isCameraLocked ? t('hud.unlockCamera') : t('hud.lockCamera')}
          position="bottom"
        >
          <IconButton
            type="button"
            onClick={() => rabiriichi.toggleCameraLock()}
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
          </IconButton>
        </Tooltip>

        <Tooltip content={t('hud.gameInfo')} position="bottom">
          <IconButton type="button" onClick={onInfoClick}>
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
          </IconButton>
        </Tooltip>

        <Tooltip content={t('hud.exitGame')} position="bottom">
          <IconButton
            type="button"
            variant="exit"
            onClick={onExitClick}
            disabled={isExiting}
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
          </IconButton>
        </Tooltip>
      </div>

      {/* Auto-play controls stay visible during play and highlight when active. */}
      <AutoPlayControls />
    </div>
  );
}

interface HUDTimerProps {
  actionTimeout: number;
  isVisible: boolean;
}

function HUDTimer({
  actionTimeout,
  isVisible,
}: HUDTimerProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (!isVisible) return null;
  const seconds = Math.ceil(actionTimeout);
  const digits = String(seconds).split('');
  return (
    <div className="absolute bottom-[22vh] right-[12%] flex flex-col items-center gap-[2px] text-white pointer-events-none">
      {/* The digits are one number, not five images: label the row and hide
          the individual glyphs from assistive tech. */}
      <div
        className="flex items-center"
        role="timer"
        aria-label={t('hud.secondsRemaining', {
          count: seconds,
          defaultValue: '{{count}}s remaining',
        })}
      >
        {digits.map((d, i) => (
          <img
            key={i}
            src={getTimerDigitPath(d)}
            alt=""
            aria-hidden
            className={HUD.timerDigit}
            draggable={false}
          />
        ))}
      </div>
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
  return createPortal(
    <div className="fixed inset-0 w-screen h-screen bg-black/70 flex justify-center items-center z-[1100] backdrop-blur-[3px] pointer-events-auto select-text">
      <div className="bg-[#2a2a2a] border-2 border-[#ff3333] rounded-xl p-6 w-[90%] max-w-[400px] shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-center box-border">
        <p className="text-base text-white mb-5 font-medium leading-[1.4]">
          {t('hud.confirmExit')}
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            type="button"
            variant="danger"
            className="flex-1 h-9 !p-0"
            onClick={onConfirm}
            disabled={isExiting}
          >
            {t('hud.confirm')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 h-9 !p-0"
            onClick={onCancel}
            disabled={isExiting}
          >
            {t('hud.cancel')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
