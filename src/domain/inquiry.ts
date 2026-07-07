import { AgariType } from '../proto/index.js';
import type {
  ISinglePlayerInquiryMsg,
  IMenLikeMsg,
  IGameTileMsg,
} from '../proto/index.js';
import type { MappedTenpaiInfo } from './model.js';

interface LongLike {
  toNumber(): number;
}

function isLongLike(val: unknown): val is LongLike {
  return (
    val != null &&
    typeof val === 'object' &&
    'toNumber' in val &&
    typeof (val as Record<string, unknown>).toNumber === 'function'
  );
}

function safeToNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (isLongLike(val)) {
    return val.toNumber();
  }
  return Number(val);
}

export interface DiscardCandidate {
  tileId: number; // traceId of candidate tile to discard
  tenpaiInfos: MappedTenpaiInfo[];
}

export type InquiryOptionType =
  | 'skip'
  | 'agari'
  | 'chii'
  | 'pon'
  | 'kan'
  | 'riichi'
  | 'play-tile'
  | 'ryuukyoku'
  | 'next-round';

export interface TileGroupOption {
  index: number; // Index in the action's tileGroups array
  tiles: { traceId: number; tile: number }[]; // Tiles in the group
}

export type ActionOption =
  | {
      type: 'skip' | 'ryuukyoku' | 'next-round';
      label: string; // "跳过" or "流局"
      actionIndex: number;
    }
  | {
      type: 'agari';
      label: string; // "和" or "自摸"
      actionIndex: number;
      incomingTileId: number | null;
    }
  | {
      type: 'chii' | 'pon' | 'kan';
      label: string; // "吃", "碰", "杠"
      actionIndex: number;
      tileGroups: TileGroupOption[];
    }
  | {
      type: 'riichi';
      label: string; // "立直"
      actionIndex: number;
      legalTiles: number[]; // Trace IDs of tiles that can be discarded
      candidates?: DiscardCandidate[];
    }
  | {
      type: 'play-tile';
      label: string; // "打"
      actionIndex: number;
      legalTiles: number[]; // Trace IDs of tiles that can be discarded
      candidates?: DiscardCandidate[];
    };

export interface MappedInquiry {
  // Option buttons to display (Skip, Chii, Pon, Kan, Riichi, Ron, Tsumo, Ryuukyoku)
  buttons: ActionOption[];

  // Normal tile discard option (if present). Not shown as button.
  playTile?: {
    actionIndex: number;
    legalTiles: number[];
    candidates?: DiscardCandidate[];
  };
}

/**
 * Maps a SinglePlayerInquiryMsg from the server into a clean structured ActionOption tree for UI presentation.
 */
export function mapInquiry(inq: ISinglePlayerInquiryMsg): MappedInquiry {
  const buttons: ActionOption[] = [];
  let playTile:
    | {
        actionIndex: number;
        legalTiles: number[];
        candidates?: DiscardCandidate[];
      }
    | undefined;

  const actions = inq.actions ?? [];
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (!action) continue;
    if (action.skipAction) {
      buttons.push({
        type: 'skip',
        label: '跳过',
        actionIndex: i,
      });
    } else if (action.ryuukyokuAction) {
      buttons.push({
        type: 'ryuukyoku',
        label: '流局',
        actionIndex: i,
      });
    } else if (action.agariAction) {
      const type = action.agariAction.type;
      const label = type === AgariType.AGARI_TYPE_TSUMO ? '自摸' : '和';
      buttons.push({
        type: 'agari',
        label,
        actionIndex: i,
        incomingTileId: action.agariAction.incoming?.traceId ?? null,
      });
    } else if (action.chiiAction) {
      const groups = action.chiiAction.tileGroups ?? [];
      buttons.push({
        type: 'chii',
        label: '吃',
        actionIndex: i,
        tileGroups: groups.map((g: IMenLikeMsg, idx: number) => ({
          index: idx,
          tiles: (g.tiles ?? []).map((t: IGameTileMsg) => ({
            traceId: t.traceId ?? 0,
            tile: t.tile ?? 0,
          })),
        })),
      });
    } else if (action.ponAction) {
      const groups = action.ponAction.tileGroups ?? [];
      buttons.push({
        type: 'pon',
        label: '碰',
        actionIndex: i,
        tileGroups: groups.map((g: IMenLikeMsg, idx: number) => ({
          index: idx,
          tiles: (g.tiles ?? []).map((t: IGameTileMsg) => ({
            traceId: t.traceId ?? 0,
            tile: t.tile ?? 0,
          })),
        })),
      });
    } else if (action.kanAction) {
      const groups = action.kanAction.tileGroups ?? [];
      buttons.push({
        type: 'kan',
        label: '杠',
        actionIndex: i,
        tileGroups: groups.map((g: IMenLikeMsg, idx: number) => ({
          index: idx,
          tiles: (g.tiles ?? []).map((t: IGameTileMsg) => ({
            traceId: t.traceId ?? 0,
            tile: t.tile ?? 0,
          })),
        })),
      });
    } else if (action.riichiAction) {
      const tiles = action.riichiAction.tiles ?? [];
      const candidates = action.riichiAction.candidates ?? [];
      buttons.push({
        type: 'riichi',
        label: '立直',
        actionIndex: i,
        legalTiles: tiles.map((t: IGameTileMsg) => t.traceId ?? 0),
        candidates: candidates.map((c) => ({
          tileId: c.tile?.traceId ?? 0,
          tenpaiInfos: (c.tenpaiInfos ?? []).map((ti) => ({
            winningTile: ti.winningTile ?? 0,
            remainingCount: ti.remainingCount ?? 0,
            han: ti.han ?? 0,
            fu: ti.fu ?? 0,
            yakuman: ti.yakuman ?? 0,
            points: safeToNumber(ti.points),
          })),
        })),
      });
    } else if (action.playTileAction) {
      const tiles = action.playTileAction.tiles ?? [];
      const candidates = action.playTileAction.candidates ?? [];
      playTile = {
        actionIndex: i,
        legalTiles: tiles.map((t: IGameTileMsg) => t.traceId ?? 0),
        candidates: candidates.map((c) => ({
          tileId: c.tile?.traceId ?? 0,
          tenpaiInfos: (c.tenpaiInfos ?? []).map((ti) => ({
            winningTile: ti.winningTile ?? 0,
            remainingCount: ti.remainingCount ?? 0,
            han: ti.han ?? 0,
            fu: ti.fu ?? 0,
            yakuman: ti.yakuman ?? 0,
            points: safeToNumber(ti.points),
          })),
        })),
      };
    } else if (action.nextRoundAction) {
      buttons.push({
        type: 'next-round',
        label: '确定',
        actionIndex: i,
      });
    }
  }

  return {
    buttons,
    ...(playTile ? { playTile } : {}),
  };
}

/**
 * Encodes the user's selected choice for an action into the { index, response } structure for the server.
 *
 * @param inq The original inquiry message
 * @param action The ActionOption they clicked or activated
 * @param choice The sub-choice value:
 *   - For 'chii' | 'pon' | 'kan': the selected TileGroupOption index (number)
 *   - For 'riichi' | 'play-tile': the traceId of the selected tile (number)
 *   - For 'agari' | 'ryuukyoku' | 'skip': omitted or null
 */
export function encodeInquiryResponse(
  inq: ISinglePlayerInquiryMsg,
  action: ActionOption,
  choice?: number,
): { index: number; response: string } {
  const index = action.actionIndex;
  const targetAction = inq.actions?.[index];

  if (!targetAction) {
    throw new Error(`Invalid actionIndex ${index} for inquiry`);
  }

  let responseStr = '{}';

  if (
    action.type === 'chii' ||
    action.type === 'pon' ||
    action.type === 'kan'
  ) {
    if (choice === undefined) {
      throw new Error(`Choice group index required for ${action.type}`);
    }
    responseStr = JSON.stringify(choice);
  } else if (action.type === 'riichi') {
    if (choice === undefined) {
      throw new Error(`Choice tile traceId required for riichi`);
    }
    const tiles = targetAction.riichiAction?.tiles ?? [];
    const idx = tiles.findIndex((t: IGameTileMsg) => t.traceId === choice);
    if (idx === -1) {
      throw new Error(`Tile traceId ${choice} not in riichi options`);
    }
    responseStr = JSON.stringify(idx);
  } else if (action.type === 'play-tile') {
    if (choice === undefined) {
      throw new Error(`Choice tile traceId required for play-tile`);
    }
    const tiles = targetAction.playTileAction?.tiles ?? [];
    const idx = tiles.findIndex((t: IGameTileMsg) => t.traceId === choice);
    if (idx === -1) {
      throw new Error(`Tile traceId ${choice} not in play-tile options`);
    }
    responseStr = JSON.stringify(idx);
  }

  return {
    index,
    response: responseStr,
  };
}

export interface AutoResponse {
  action: ActionOption;
  choice?: number;
}

export interface FlatOption {
  action: ActionOption;
  choice?: number;
}

export function flattenInquiry(mapped: MappedInquiry): FlatOption[] {
  const options: FlatOption[] = [];

  // Add playTile options
  if (mapped.playTile) {
    const playTileAction: ActionOption = {
      type: 'play-tile',
      label: '打',
      actionIndex: mapped.playTile.actionIndex,
      legalTiles: mapped.playTile.legalTiles,
      ...(mapped.playTile.candidates
        ? { candidates: mapped.playTile.candidates }
        : {}),
    };
    for (const traceId of mapped.playTile.legalTiles) {
      options.push({
        action: playTileAction,
        choice: traceId,
      });
    }
  }

  // Add button options
  for (const btn of mapped.buttons) {
    switch (btn.type) {
      case 'chii':
      case 'pon':
      case 'kan': {
        for (const group of btn.tileGroups) {
          options.push({
            action: btn,
            choice: group.index,
          });
        }
        break;
      }
      case 'riichi': {
        for (const traceId of btn.legalTiles) {
          options.push({
            action: btn,
            choice: traceId,
          });
        }
        break;
      }
      case 'skip':
      case 'agari':
      case 'ryuukyoku':
      case 'next-round':
      case 'play-tile':
        options.push({
          action: btn,
        });
        break;
    }
  }

  return options;
}

export function getAutoResponse(mapped: MappedInquiry): AutoResponse | null {
  const flatOptions = flattenInquiry(mapped);
  if (flatOptions.length === 1) {
    const opt = flatOptions[0];
    if (opt && opt.action.type !== 'next-round') {
      return {
        action: opt.action,
        ...(opt.choice !== undefined ? { choice: opt.choice } : {}),
      };
    }
  }
  return null;
}
