import React, { useState, useMemo } from 'react';
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
import { GameInfoPanel, TenpaiWaitPanel } from './GamePlayHUD';
import { HandDisplay } from './HandDisplay';
import { FullscreenButton } from './FullscreenButton';
import { GameInfoModal } from './GameInfoModal';
import { InitialWallModal } from './InitialWallModal';
import { Tooltip } from './Tooltip';
import { SettingsButton } from './SettingsButton';
import { IconButton } from './IconButton';
import { useHoverOrTouchHold } from './useHoverOrTouchHold';

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
  const [isWallOpen, setIsWallOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showPermanentWaits, showPermanentWaitsBind] = useHoverOrTouchHold(300);

  const selfPlayer = useMemo(() => {
    if (!room || !currentUser) return null;
    return room.players.find((p) => p.id === currentUser.id) ?? null;
  }, [room, currentUser]);

  const permanentAwaitedTiles = useMemo(() => {
    return selfPlayer?.gameState?.awaitedTiles ?? [];
  }, [selfPlayer]);

  const hasPermanentTenpai = permanentAwaitedTiles.length > 0;

  const isFuriten = useMemo(() => {
    if (!selfPlayer?.gameState?.furiten) return false;
    return Object.values(selfPlayer.gameState.furiten).some(Boolean);
  }, [selfPlayer]);

  const minHan = room?.config?.minHan ?? 1;

  const currentRoundIdx = getCurrentRoundIndex();
  const roundStartIndices = getRoundStartIndices();
  const hasPrevRound = currentRoundIdx > 0;
  const hasNextRound = currentRoundIdx < roundStartIndices.length - 1;

  const replayBtnBaseClass =
    'bg-[#2a2a2a] border border-[#555] rounded-full text-white w-11 h-11 flex items-center justify-center transition-all duration-200 p-0 enabled:hover:border-[#ff7a99] enabled:hover:text-[#ff7a99] enabled:hover:scale-[1.05] disabled:opacity-40 disabled:cursor-not-allowed';

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
    <div className="absolute inset-0 pointer-events-none z-[40] select-none">
      {/* Left HUD Panel */}
      <div className="absolute top-5 left-5 flex flex-col gap-3 pointer-events-none z-50">
        <GameInfoPanel />

        {/* Speed Settings (copied from GamePlayHUD settings-panel) */}
        <div className="bg-[#141414]/85 border-[1.5px] border-[#444] rounded-lg py-1.5 px-3 flex flex-row items-center gap-2 text-white pointer-events-auto shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <label
            htmlFor="speed-select"
            className="text-[0.8rem] font-bold text-[#aaa]"
          >
            {t('hud.speed')}
          </label>
          <select
            id="speed-select"
            value={animationSpeed}
            onChange={(e) =>
              rabiriichi.setAnimationSpeed(Number(e.target.value))
            }
            className="bg-[#222] text-white border border-[#555] rounded py-0.5 px-1.5 text-[0.9rem] cursor-pointer outline-none"
          >
            <option value="0.25">x0.25</option>
            <option value="0.5">x0.5</option>
            <option value="1">x1.0</option>
            <option value="2">x2.0</option>
            <option value="4">x4.0</option>
            <option value="8">x8.0</option>
          </select>
        </div>

        <div className="flex flex-row gap-2">
          <FullscreenButton />

          <Tooltip
            content={
              isCameraLocked ? t('hud.unlockCamera') : t('hud.lockCamera')
            }
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
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  ></rect>
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
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  ></rect>
                  <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                </svg>
              )}
            </IconButton>
          </Tooltip>

          <Tooltip content={t('hud.gameInfo')} position="bottom">
            <IconButton type="button" onClick={() => setIsInfoOpen(true)}>
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

          <Tooltip
            content={t('replay.initialWallTitle', 'Initial Wall & Doras')}
            position="bottom"
          >
            <IconButton type="button" onClick={() => setIsWallOpen(true)}>
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
              </svg>
            </IconButton>
          </Tooltip>

          <Tooltip content={t('hud.exitGame')} position="bottom">
            <IconButton
              type="button"
              variant="exit"
              onClick={() => stopReplay()}
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
      </div>

      {/* Top Right HUD (Settings) */}
      <div className="pointer-events-auto absolute top-5 right-5 z-[50]">
        <SettingsButton />
      </div>

      {/* Replay Controls Toolbar (Bottom Center) */}
      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#141414]/90 border-2 border-[#ff7a99] border-b-0 rounded-t-xl pt-4 px-6 pb-3 flex flex-col items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] z-[95] min-w-[450px] box-border transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] pointer-events-auto group ${
          isCollapsed ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <div
          className="absolute top-[-26px] left-1/2 -translate-x-1/2 bg-[#141414]/90 border-2 border-[#ff7a99] border-b-0 rounded-t-lg py-[2px] px-5 text-[0.8rem] cursor-pointer z-[96] transition-all duration-200 select-none text-[#ff7a99]"
          onClick={() => setIsCollapsed((prev) => !prev)}
        >
          <span
            className={`inline-block transition-transform duration-300 ${
              isCollapsed ? 'rotate-0' : 'rotate-180'
            }`}
          >
            ▲
          </span>
        </div>

        <div className="w-full flex flex-col items-center gap-1 mb-1">
          <span className="text-xs text-[#aaa] font-mono">
            {progress} / {total}
          </span>
          <input
            type="range"
            min="0"
            max={total}
            value={progress}
            onChange={(e) => seekToEvent(Number(e.target.value))}
            className="w-full appearance-none bg-[#333] h-1.5 rounded-[3px] outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ff7a99] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100 [&::-webkit-slider-thumb]:hover:scale-[1.25] [&::-webkit-slider-thumb]:hover:bg-[#ff99b0]"
          />
        </div>

        <div className="w-full flex justify-center items-center gap-8">
          <div className="flex gap-4 items-center">
            <Tooltip
              content={t('replay.stepBackward', 'Step Backward')}
              position="top"
            >
              <button
                type="button"
                className={replayBtnBaseClass}
                onClick={() => stepReplay(-1)}
                disabled={!isPaused}
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
            </Tooltip>

            <Tooltip
              content={isPaused ? t('replay.play') : t('replay.pause')}
              position="top"
            >
              <button
                type="button"
                className="rounded-full text-white w-[52px] h-[52px] flex items-center justify-center transition-all duration-200 p-0 bg-[#ff7a99] border border-[#ff7a99] enabled:hover:bg-[#ff99bb] enabled:hover:border-[#ff99bb] enabled:hover:text-white enabled:hover:scale-[1.05] disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={togglePause}
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
            </Tooltip>

            <Tooltip
              content={t('replay.stepForward', 'Step Forward')}
              position="top"
            >
              <button
                type="button"
                className={replayBtnBaseClass}
                onClick={() => stepReplay(1)}
                disabled={!isPaused}
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
            </Tooltip>
          </div>

          {/* Round Navigation Jumper */}
          <div className="flex items-center gap-3 bg-[#1e1e1e]/60 border border-[#ff7a99]/30 rounded-lg py-1 px-4">
            <Tooltip
              content={t('replay.prevRound', 'Previous Round')}
              position="top"
            >
              <button
                type="button"
                className={replayBtnBaseClass}
                onClick={() => jumpToRound(currentRoundIdx - 1)}
                disabled={!hasPrevRound}
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
            </Tooltip>
            <span className="text-[#ff7a99] font-bold text-[0.95rem] min-w-[140px] text-center select-none">
              {getRoundText()}
            </span>
            <Tooltip
              content={t('replay.nextRound', 'Next Round')}
              position="top"
            >
              <button
                type="button"
                className={replayBtnBaseClass}
                onClick={() => jumpToRound(currentRoundIdx + 1)}
                disabled={!hasNextRound}
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
            </Tooltip>
          </div>
        </div>

        {/* Player Perspective Selector (Move to separate row) */}
        <div className="flex flex-col items-center gap-1.5 w-full border-t border-[#333] pt-2">
          <span className="text-xs font-bold text-[#aaa] uppercase tracking-[1px]">
            {t('replay.perspective')}:
          </span>
          <div className="flex gap-1.5 flex-wrap justify-center">
            {players.map((p) => {
              const isCurrent = currentUser.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`bg-[#1a1a1a] border border-[#444] rounded-[6px] text-[#ccc] py-1 px-2.5 text-[0.8rem] cursor-pointer transition-all duration-200 hover:border-[#ff7a99] hover:text-white ${
                    isCurrent
                      ? 'bg-[#ff7a99]/15 border-[#ff7a99] text-[#ff7a99] font-bold'
                      : ''
                  }`}
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

      {/* Game Info Modal */}
      <GameInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        room={room}
      />

      {/* Initial Wall Modal */}
      <InitialWallModal
        isOpen={isWallOpen}
        onClose={() => setIsWallOpen(false)}
        room={room}
      />
      {/* Permanent Hover Tenpai Panel (Fixed Position) */}
      {showPermanentWaits && permanentAwaitedTiles.length > 0 && (
        <TenpaiWaitPanel
          awaitedTiles={permanentAwaitedTiles}
          minHan={minHan}
          className="absolute left-1/2 -translate-x-1/2 flex flex-col gap-1.5 bottom-[18vh]"
          isFuriten={isFuriten}
        />
      )}

      {/* 2D Permanent Tenpai/Furiten Badge Overlay (positioned near the hand) */}
      {(hasPermanentTenpai || isFuriten) && (
        <div className="absolute bottom-[13vh] left-[calc(50%-24vw)] z-[90] flex flex-col items-center pointer-events-auto">
          <div
            className={`min-w-[36px] h-[36px] rounded-[18px] px-2 box-border bg-[#121c32]/85 border-2 flex items-center justify-center text-[1.05rem] font-bold cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-200 select-none ${
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

      {/*
        The viewed seat's hand. PlayerArea3D hides the local player's 3D hand in
        favour of this DOM one, so the replay HUD has to render it too — without
        it the hand disappears entirely. A replay never issues an inquiry, so no
        tile is legal and the hand is inert here (not clickable or draggable).
      */}
      <HandDisplay />
    </div>
  );
}
