import { useSyncExternalStore } from 'react';
import { rabiriichi } from '../net/client';
import type { ConnectionStatus, ActiveInquiry } from '../net/client';
import type { PlayerModel, RoomModel } from '../domain/model';
import type { ActionOption } from '../domain/inquiry';
import type { YakuInfo } from '../domain/yakus';

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
  isCameraLocked: boolean;
  resultAnimation: 'agari' | 'ryuukyoku' | null;
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
    lastSnapshot.isCameraLocked !== rabiriichi.isCameraLocked ||
    lastSnapshot.resultAnimation !== rabiriichi.resultAnimation
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
      isCameraLocked: rabiriichi.isCameraLocked,
      resultAnimation: rabiriichi.resultAnimation,
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

export function useIsCameraLocked(): boolean {
  return useSyncExternalStore(subscribe, getIsCameraLocked, getIsCameraLocked);
}

const getAvailableYakus = () => rabiriichi.availableYakus;

export function useAvailableYakus(): YakuInfo[] {
  return useSyncExternalStore(subscribe, getAvailableYakus, getAvailableYakus);
}

export function useResultAnimation(): 'agari' | 'ryuukyoku' | null {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.resultAnimation,
    () => rabiriichi.resultAnimation,
  );
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
