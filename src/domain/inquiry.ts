import { AgariType } from '../proto/index.js';
import type {
  ISinglePlayerInquiryMsg,
  IMenLikeMsg,
  IGameTileMsg,
  ITenpaiInfoMsg,
} from '../proto/index.js';
import type { MappedTenpaiInfo } from './model.js';
import { countRemainingWinningTile, type TileKindCounts } from './tenpai.js';

/**
 * Inputs needed to derive each discard candidate's winning-tile remaining count
 * client-side (the server no longer sends it). See collectVisibleTileKindsFromRoom
 * and buildTileSetCounts.
 */
export interface WaitCountContext {
  /** Akadora-normalized kinds the local player can currently see. */
  visibleKinds: readonly number[];
  /** Per-kind maximums from the configured tile set. */
  tileSetCounts: TileKindCounts;
}

const EMPTY_WAIT_CONTEXT: WaitCountContext = {
  visibleKinds: [],
  tileSetCounts: new Map(),
};

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
  | 'nukidora'
  | 'riichi'
  | 'play-tile'
  | 'ryuukyoku'
  | 'next-round';

export interface TileGroupOption {
  index: number; // Index in the action's tileGroups array
  tiles: { traceId: number; tile: number; isCalled?: boolean }[]; // Tiles in the group
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
      /** A self-draw win, so the UI announces tsumo rather than ron. */
      isTsumo: boolean;
    }
  | {
      type: 'chii' | 'pon' | 'kan';
      label: string; // "吃", "碰", "杠"
      actionIndex: number;
      tileGroups: TileGroupOption[];
    }
  | {
      type: 'nukidora';
      label: string; // "拔北" / "North"
      actionIndex: number;
      // All North tiles are interchangeable, so pulling submits the first option.
      choiceIndex: number;
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

/** Shape of a proto DiscardCandidateMsg (shared by play-tile and riichi). */
interface ProtoDiscardCandidate {
  tile?: IGameTileMsg | null;
  tenpaiInfos?: ITenpaiInfoMsg[] | null;
}

/**
 * Maps proto discard candidates (from either the play-tile or riichi action)
 * into the client model, deriving each wait's remaining count.
 */
function mapDiscardCandidates(
  candidates: ProtoDiscardCandidate[],
  ctx: WaitCountContext,
): DiscardCandidate[] {
  return candidates.map((c) => ({
    tileId: c.tile?.traceId ?? 0,
    tenpaiInfos: (c.tenpaiInfos ?? []).map((ti) => {
      const winningTile = ti.winningTile ?? 0;
      return {
        winningTile,
        remainingCount: countRemainingWinningTile(
          winningTile,
          ctx.visibleKinds,
          ctx.tileSetCounts,
        ),
        han: ti.han ?? 0,
        yakuHan: ti.yakuHan ?? 0,
        fu: ti.fu ?? 0,
        yakuman: ti.yakuman ?? 0,
        bonusYakuman: ti.bonusYakuman ?? 0,
        points: safeToNumber(ti.points),
        maxHan: ti.maxHan ?? 0,
      };
    }),
  }));
}

/**
 * Maps a SinglePlayerInquiryMsg from the server into a clean structured
 * ActionOption tree for UI presentation.
 *
 * `waitContext` supplies what the client needs to derive each discard
 * candidate's winning-tile remaining count (the server no longer sends it).
 */
export function mapInquiry(
  inq: ISinglePlayerInquiryMsg,
  waitContext: WaitCountContext = EMPTY_WAIT_CONTEXT,
  selfSeat?: number,
): MappedInquiry {
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
      const isTsumo = action.agariAction.type === AgariType.AGARI_TYPE_TSUMO;
      buttons.push({
        type: 'agari',
        label: isTsumo ? '自摸' : '和',
        actionIndex: i,
        incomingTileId: action.agariAction.incoming?.traceId ?? null,
        isTsumo,
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
            isCalled:
              t.discardInfo && selfSeat !== undefined
                ? t.discardInfo.from !== selfSeat
                : false,
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
            isCalled:
              t.discardInfo && selfSeat !== undefined
                ? t.discardInfo.from !== selfSeat
                : false,
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
            isCalled:
              t.discardInfo && selfSeat !== undefined
                ? t.discardInfo.from !== selfSeat
                : false,
          })),
        })),
      });
    } else if (action.nukiDoraAction) {
      buttons.push({
        type: 'nukidora',
        label: '拔北',
        actionIndex: i,
        // All North tiles are interchangeable; pull the first one.
        choiceIndex: 0,
      });
    } else if (action.riichiAction) {
      const tiles = action.riichiAction.tiles ?? [];
      const candidates = action.riichiAction.candidates ?? [];
      buttons.push({
        type: 'riichi',
        label: '立直',
        actionIndex: i,
        legalTiles: tiles.map((t: IGameTileMsg) => t.traceId ?? 0),
        candidates: mapDiscardCandidates(candidates, waitContext),
      });
    } else if (action.playTileAction) {
      const tiles = action.playTileAction.tiles ?? [];
      const candidates = action.playTileAction.candidates ?? [];
      playTile = {
        actionIndex: i,
        legalTiles: tiles.map((t: IGameTileMsg) => t.traceId ?? 0),
        candidates: mapDiscardCandidates(candidates, waitContext),
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
  } else if (action.type === 'nukidora') {
    // Single-choice action: submit the (interchangeable) North option index.
    responseStr = JSON.stringify(choice ?? action.choiceIndex);
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
      case 'nukidora':
        options.push({
          action: btn,
          choice: btn.choiceIndex,
        });
        break;
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

export interface ActiveDiscardCandidate {
  candidate: DiscardCandidate;
  /** True when this tile will be discarded as a riichi declaration. */
  isRiichi: boolean;
}

/**
 * Finds the discard candidate for a hovered/selected tile, and whether it will
 * be discarded as a riichi declaration.
 *
 * When the player is in riichi-select mode, the tile (if any) is being chosen
 * for a riichi discard, so the riichi candidates are consulted and `isRiichi` is
 * true (declaring riichi guarantees +1 yaku, which the 番缚 check must count).
 * Otherwise it is a normal discard and the play-tile candidates are used.
 */
export function findActiveDiscardCandidate(
  mapped: MappedInquiry,
  traceId: number,
  isRiichiSelectMode: boolean,
): ActiveDiscardCandidate | null {
  if (isRiichiSelectMode) {
    const riichiButton = mapped.buttons.find((b) => b.type === 'riichi');
    const candidate = riichiButton?.candidates?.find(
      (c) => c.tileId === traceId,
    );
    return candidate ? { candidate, isRiichi: true } : null;
  }

  const candidate = mapped.playTile?.candidates?.find(
    (c) => c.tileId === traceId,
  );
  return candidate ? { candidate, isRiichi: false } : null;
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

export function getClaimTargetTileId(
  mapped: MappedInquiry | null,
): number | null {
  if (!mapped) return null;
  for (const button of mapped.buttons) {
    if (button.type === 'agari' && button.incomingTileId != null) {
      return button.incomingTileId;
    }
    if (
      button.type === 'chii' ||
      button.type === 'pon' ||
      button.type === 'kan'
    ) {
      for (const group of button.tileGroups) {
        const calledTile = group.tiles.find((t) => t.isCalled);
        if (calledTile) {
          return calledTile.traceId;
        }
      }
    }
  }
  return null;
}
