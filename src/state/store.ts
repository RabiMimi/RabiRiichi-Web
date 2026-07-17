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
  autoAgari: boolean;
  noCalls: boolean;
  autoDiscard: boolean;
  autoNuki: boolean;
  activeStickers: Record<string, string>;
  activeChatTexts: Record<number, string>;
  characterId: string;
  volumeSE: number;
  volumeBGM: number;
  volumeVoice: number;
  muteSE: boolean;
  muteBGM: boolean;
  muteVoice: boolean;
  muteAll: boolean;
  isSettingsOpen: boolean;
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
    lastSnapshot.hasInMemoryResult !== rabiriichi.hasInMemoryResult ||
    lastSnapshot.autoAgari !== rabiriichi.autoAgari ||
    lastSnapshot.noCalls !== rabiriichi.noCalls ||
    lastSnapshot.autoDiscard !== rabiriichi.autoDiscard ||
    lastSnapshot.autoNuki !== rabiriichi.autoNuki ||
    lastSnapshot.activeStickers !== rabiriichi.activeStickers ||
    lastSnapshot.activeChatTexts !== rabiriichi.activeChatTexts ||
    lastSnapshot.characterId !== rabiriichi.visuals.characterId ||
    lastSnapshot.volumeSE !== rabiriichi.sounds.volumeSE ||
    lastSnapshot.volumeBGM !== rabiriichi.sounds.volumeBGM ||
    lastSnapshot.volumeVoice !== rabiriichi.sounds.volumeVoice ||
    lastSnapshot.muteSE !== rabiriichi.sounds.muteSE ||
    lastSnapshot.muteBGM !== rabiriichi.sounds.muteBGM ||
    lastSnapshot.muteVoice !== rabiriichi.sounds.muteVoice ||
    lastSnapshot.muteAll !== rabiriichi.sounds.muteAll ||
    lastSnapshot.isSettingsOpen !== rabiriichi.isSettingsOpen
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
      autoAgari: rabiriichi.autoAgari,
      noCalls: rabiriichi.noCalls,
      autoDiscard: rabiriichi.autoDiscard,
      autoNuki: rabiriichi.autoNuki,
      activeStickers: rabiriichi.activeStickers,
      activeChatTexts: rabiriichi.activeChatTexts,
      characterId: rabiriichi.visuals.characterId,
      volumeSE: rabiriichi.sounds.volumeSE,
      volumeBGM: rabiriichi.sounds.volumeBGM,
      volumeVoice: rabiriichi.sounds.volumeVoice,
      muteSE: rabiriichi.sounds.muteSE,
      muteBGM: rabiriichi.sounds.muteBGM,
      muteVoice: rabiriichi.sounds.muteVoice,
      muteAll: rabiriichi.sounds.muteAll,
      isSettingsOpen: rabiriichi.isSettingsOpen,
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

export function useAutoAgari(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.autoAgari,
    () => rabiriichi.autoAgari,
  );
}

export function useNoCalls(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.noCalls,
    () => rabiriichi.noCalls,
  );
}

export function useAutoDiscard(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.autoDiscard,
    () => rabiriichi.autoDiscard,
  );
}

export function useAutoNuki(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.autoNuki,
    () => rabiriichi.autoNuki,
  );
}

export function useActiveStickers(): Record<string, string> {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.activeStickers,
    () => rabiriichi.activeStickers,
  );
}

export function useActiveChatTexts(): Record<number, string> {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.activeChatTexts,
    () => rabiriichi.activeChatTexts,
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
    return room.info.doras
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

import { getClaimTargetTileId } from '../domain/inquiry';

function getClaimTargetTileIdSelector(): number | null {
  const state = getSnapshot();
  return getClaimTargetTileId(state.currentInquiry?.mapped ?? null);
}

export function useClaimTargetTileId(): number | null {
  return useSyncExternalStore(
    subscribe,
    getClaimTargetTileIdSelector,
    getClaimTargetTileIdSelector,
  );
}

import type { ClientSettings } from '../domain/constants';

export function updateClientSettings(patch: Partial<ClientSettings>): void {
  rabiriichi.updateClientSettings(patch);
}

export function useCharacterId(): string {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.visuals.characterId,
    () => rabiriichi.visuals.characterId,
  );
}

export function useVolumeSE(): number {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.sounds.volumeSE,
    () => rabiriichi.sounds.volumeSE,
  );
}

export function useVolumeBGM(): number {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.sounds.volumeBGM,
    () => rabiriichi.sounds.volumeBGM,
  );
}

export function useVolumeVoice(): number {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.sounds.volumeVoice,
    () => rabiriichi.sounds.volumeVoice,
  );
}

export function useMuteSE(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.sounds.muteSE,
    () => rabiriichi.sounds.muteSE,
  );
}

export function useMuteBGM(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.sounds.muteBGM,
    () => rabiriichi.sounds.muteBGM,
  );
}

export function useMuteVoice(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.sounds.muteVoice,
    () => rabiriichi.sounds.muteVoice,
  );
}

export function useMuteAll(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.sounds.muteAll,
    () => rabiriichi.sounds.muteAll,
  );
}

export function setSettingsOpen(isOpen: boolean): void {
  rabiriichi.setSettingsOpen(isOpen);
}

export function useIsSettingsOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => rabiriichi.isSettingsOpen,
    () => rabiriichi.isSettingsOpen,
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
