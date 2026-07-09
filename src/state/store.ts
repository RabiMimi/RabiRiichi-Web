import { useSyncExternalStore, useMemo } from 'react';
import { rabiriichi } from '../net/client';
import type { ConnectionStatus, ActiveInquiry } from '../net/client';
import type { PlayerModel, RoomModel } from '../domain/model';
import type { ActionOption } from '../domain/inquiry';
import type { YakuInfo } from '../domain/yakus';
import { Tile } from '../domain/tile';

// Note: GameState is folded into RoomModel (specifically via RoomModel.info and players[].gameState)
export interface RabiRiichiState {
  connectionStatus: ConnectionStatus;
  self: PlayerModel | null;
  room: RoomModel | null;
  currentInquiry: ActiveInquiry | null;
  isRiichiSelectMode: boolean;
  pendingActionOption: ActionOption | null;
  animationSpeed: number;
  isWaitingForProceed: boolean;
  actionTimeout: number;
  timerActiveSeat: number | null;
  ping: number;
  selectedTileTraceId: number | null;
  hoveredTileTraceId: number | null;
  isCameraLocked: boolean;
  resultAnimation: 'agari' | 'ryuukyoku' | null;
  isReplay: boolean;
  isReplayPaused: boolean;
  replayProgress: number;
  replayTotal: number;
  hasInMemoryResult: boolean;
}

function subscribe(onStoreChange: () => void): () => void {
  rabiriichi.onChange.subscribe(onStoreChange);
  return () => rabiriichi.onChange.unsubscribe(onStoreChange);
}

let lastSnapshot: RabiRiichiState | null = null;

function getSnapshot(): RabiRiichiState {
  if (
    lastSnapshot?.connectionStatus !== rabiriichi.connectionStatus ||
    lastSnapshot.self !== rabiriichi.self ||
    lastSnapshot.room !== rabiriichi.room ||
    lastSnapshot.currentInquiry !== rabiriichi.currentInquiry ||
    lastSnapshot.isRiichiSelectMode !== rabiriichi.isRiichiSelectMode ||
    lastSnapshot.pendingActionOption !== rabiriichi.pendingActionOption ||
    lastSnapshot.animationSpeed !== rabiriichi.animationSpeed ||
    lastSnapshot.isWaitingForProceed !== rabiriichi.isWaitingForProceed ||
    lastSnapshot.actionTimeout !== rabiriichi.actionTimeout ||
    lastSnapshot.timerActiveSeat !== rabiriichi.timerActiveSeat ||
    lastSnapshot.ping !== rabiriichi.ping ||
    lastSnapshot.selectedTileTraceId !== rabiriichi.selectedTileTraceId ||
    lastSnapshot.hoveredTileTraceId !== rabiriichi.hoveredTileTraceId ||
    lastSnapshot.isCameraLocked !== rabiriichi.isCameraLocked ||
    lastSnapshot.resultAnimation !== rabiriichi.resultAnimation ||
    lastSnapshot.isReplay !== rabiriichi.isReplay ||
    lastSnapshot.isReplayPaused !== rabiriichi.isReplayPaused ||
    lastSnapshot.replayProgress !== rabiriichi.replayProgress ||
    lastSnapshot.replayTotal !== rabiriichi.replayTotal ||
    lastSnapshot.hasInMemoryResult !== rabiriichi.hasInMemoryResult
  ) {
    lastSnapshot = {
      connectionStatus: rabiriichi.connectionStatus,
      self: rabiriichi.self,
      room: rabiriichi.room,
      currentInquiry: rabiriichi.currentInquiry,
      isRiichiSelectMode: rabiriichi.isRiichiSelectMode,
      pendingActionOption: rabiriichi.pendingActionOption,
      animationSpeed: rabiriichi.animationSpeed,
      isWaitingForProceed: rabiriichi.isWaitingForProceed,
      actionTimeout: rabiriichi.actionTimeout,
      timerActiveSeat: rabiriichi.timerActiveSeat,
      ping: rabiriichi.ping,
      selectedTileTraceId: rabiriichi.selectedTileTraceId,
      hoveredTileTraceId: rabiriichi.hoveredTileTraceId,
      isCameraLocked: rabiriichi.isCameraLocked,
      resultAnimation: rabiriichi.resultAnimation,
      isReplay: rabiriichi.isReplay,
      isReplayPaused: rabiriichi.isReplayPaused,
      replayProgress: rabiriichi.replayProgress,
      replayTotal: rabiriichi.replayTotal,
      hasInMemoryResult: rabiriichi.hasInMemoryResult,
    };
  }
  return lastSnapshot;
}

const getConnectionStatus = () => rabiriichi.connectionStatus;
const getSelf = () => rabiriichi.self;
const getRoom = () => rabiriichi.room;
const getCurrentInquiry = () => rabiriichi.currentInquiry;
const getIsRiichiSelectMode = () => rabiriichi.isRiichiSelectMode;
const getPendingActionOption = () => rabiriichi.pendingActionOption;
const getAnimationSpeed = () => rabiriichi.animationSpeed;
const getIsWaitingForProceed = () => rabiriichi.isWaitingForProceed;
const getIsReplay = () => rabiriichi.isReplay;
const getIsReplayPaused = () => rabiriichi.isReplayPaused;
const getReplayProgress = () => rabiriichi.replayProgress;
const getReplayTotal = () => rabiriichi.replayTotal;

export function useRabiRiichiState(): RabiRiichiState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useAnimationSpeed(): number {
  return useSyncExternalStore(subscribe, getAnimationSpeed, getAnimationSpeed);
}

export function useIsWaitingForProceed(): boolean {
  return useSyncExternalStore(
    subscribe,
    getIsWaitingForProceed,
    getIsWaitingForProceed,
  );
}

export function useIsReplay(): boolean {
  return useSyncExternalStore(subscribe, getIsReplay, getIsReplay);
}

export function useIsReplayPaused(): boolean {
  return useSyncExternalStore(subscribe, getIsReplayPaused, getIsReplayPaused);
}

export function useReplayProgress(): number {
  return useSyncExternalStore(subscribe, getReplayProgress, getReplayProgress);
}

export function useReplayTotal(): number {
  return useSyncExternalStore(subscribe, getReplayTotal, getReplayTotal);
}

export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(
    subscribe,
    getConnectionStatus,
    getConnectionStatus,
  );
}

export function useSelf(): PlayerModel | null {
  return useSyncExternalStore(subscribe, getSelf, getSelf);
}

export function useRoom(): RoomModel | null {
  return useSyncExternalStore(subscribe, getRoom, getRoom);
}

export function useCurrentInquiry(): ActiveInquiry | null {
  return useSyncExternalStore(subscribe, getCurrentInquiry, getCurrentInquiry);
}

export function useIsRiichiSelectMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    getIsRiichiSelectMode,
    getIsRiichiSelectMode,
  );
}

export function usePendingActionOption(): ActionOption | null {
  return useSyncExternalStore(
    subscribe,
    getPendingActionOption,
    getPendingActionOption,
  );
}

export function useActionTimeout(): number {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.actionTimeout,
    () => rabiriichi.actionTimeout,
  );
}

export function usePing(): number {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.ping,
    () => rabiriichi.ping,
  );
}

export function useTimerActiveSeat(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.timerActiveSeat,
    () => rabiriichi.timerActiveSeat,
  );
}

const getSelectedTileTraceId = () => rabiriichi.selectedTileTraceId;
const getIsCameraLocked = () => rabiriichi.isCameraLocked;

export function useSelectedTileTraceId(): number | null {
  return useSyncExternalStore(
    subscribe,
    getSelectedTileTraceId,
    getSelectedTileTraceId,
  );
}

const getHoveredTileTraceId = () => rabiriichi.hoveredTileTraceId;

export function useHoveredTileTraceId(): number | null {
  return useSyncExternalStore(
    subscribe,
    getHoveredTileTraceId,
    getHoveredTileTraceId,
  );
}

export function useIsCameraLocked(): boolean {
  return useSyncExternalStore(subscribe, getIsCameraLocked, getIsCameraLocked);
}

const getAvailableYakus = () => rabiriichi.availableYakus;

export function useAvailableYakus(): YakuInfo[] {
  return useSyncExternalStore(subscribe, getAvailableYakus, getAvailableYakus);
}

export function useHasInMemoryResult(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.hasInMemoryResult,
    () => rabiriichi.hasInMemoryResult,
  );
}

export function useResultAnimation(): 'agari' | 'ryuukyoku' | null {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.resultAnimation,
    () => rabiriichi.resultAnimation,
  );
}

const getActiveComparisonTile = (): string | null => {
  const room = rabiriichi.room;
  const hoveredTraceId = rabiriichi.hoveredTileTraceId;
  const selectedTraceId = rabiriichi.selectedTileTraceId;
  const traceId = hoveredTraceId ?? selectedTraceId;
  if (traceId == null || !room?.tileRegistry) return null;
  const tileMsg = room.tileRegistry.get(traceId);
  if (tileMsg?.tile == null) return null;
  try {
    return Tile.fromByte(tileMsg.tile).toString();
  } catch {
    return null;
  }
};

export function useActiveComparisonTile(): string | null {
  return useSyncExternalStore(
    subscribe,
    getActiveComparisonTile,
    getActiveComparisonTile,
  );
}

export function useDoraIndicators(): Tile[] {
  const room = useRoom();
  return useMemo(() => {
    if (!room?.info?.doras) return [];
    const count = room.info.revealedDoraCount;
    return room.info.doras
      .slice(0, count)
      .map((doraMsg) => {
        if (doraMsg.tile === null || doraMsg.tile === undefined) return null;
        try {
          return Tile.fromByte(doraMsg.tile);
        } catch {
          return null;
        }
      })
      .filter((t): t is Tile => t !== null);
  }, [room]);
}

function resetForTest(): void {
  lastSnapshot = null;
}

// Export raw subscribe/getSnapshot for testing without React
export const testStore = {
  subscribe,
  getSnapshot,
  getConnectionStatus,
  getSelf,
  getRoom,
  getCurrentInquiry,
  getIsWaitingForProceed,
  reset: resetForTest,
};
