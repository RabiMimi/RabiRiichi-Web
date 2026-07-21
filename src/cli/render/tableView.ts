/**
 * Pure view-model builders that turn the shared domain models into
 * terminal-renderable data (arrays of {@link TileGlyph}, seat rows, labels).
 *
 * These functions are Ink/React-free so they can be unit-tested directly. The
 * Ink components consume their output and only concern themselves with layout
 * and color application.
 */
import type { RoomModel, PlayerModel } from '../../domain/model';
import { getPlayerDisplayName, getWindKey } from '../../domain/model';
import type { IGameTileMsg } from '../../proto';
import { AiType, UserStatus } from '../../proto';
import { deriveTileInfo } from '../../domain/tileInfo';
import { type TileGlyph, type TileMode, glyphForByte } from './tileGlyph';

export interface MeldView {
  tiles: TileGlyph[];
}

/** A tile in the discard river with its tedashi/tsumogiri classification. */
export interface RiverTileView {
  glyph: TileGlyph;
  /** True = tedashi (hand discard), false = tsumogiri, null = unknown. */
  isTedashi: boolean | null;
}

/** Everything needed to render one player's area on the table. */
export interface SeatView {
  seat: number;
  name: string;
  points: number;
  isDealer: boolean;
  isCurrent: boolean;
  isRiichi: boolean;
  isSelf: boolean;
  isAi: boolean;
  hand: TileGlyph[];
  drawn: TileGlyph | null;
  melds: MeldView[];
  river: RiverTileView[];
  handCount: number;
}

function tilesToGlyphs(
  tiles: IGameTileMsg[] | null | undefined,
  mode: TileMode,
): TileGlyph[] {
  if (!tiles) return [];
  return tiles.map((tt) => glyphForByte(tt.tile ?? 0, mode));
}

/**
 * Builds a {@link SeatView} for one player. When `revealHand` is false, the
 * concealed hand is rendered face-down (backs) — matching how opponents' hands
 * are hidden during play.
 */
export function buildSeatView(
  room: RoomModel,
  player: PlayerModel,
  selfId: number | undefined,
  mode: TileMode,
  t: (key: string) => string,
): SeatView {
  const gs = player.gameState;
  const info = room.info;
  const isSelf = player.id === selfId;
  const revealHand =
    isSelf || (gs?.agari != null && gs.agari.isTenpai !== false);

  const freeTiles = gs?.hand.freeTiles ?? [];
  const hand = revealHand
    ? tilesToGlyphs(freeTiles, mode)
    : freeTiles.map(() => glyphForByte(0, mode));

  const pending = gs?.hand.pendingTile ?? null;
  const drawn =
    pending != null
      ? revealHand
        ? glyphForByte(pending.tile ?? 0, mode)
        : glyphForByte(0, mode)
      : null;

  return {
    seat: player.seat ?? 0,
    name: getPlayerDisplayName(player, t),
    points: gs?.points ?? 0,
    isDealer: info?.dealer === player.seat,
    isCurrent: info?.currentPlayer === player.seat,
    isRiichi: (gs?.riichiTileId ?? 0) > 0,
    isSelf,
    isAi: player.aiType !== AiType.AI_TYPE_NONE,
    hand,
    drawn,
    melds: (gs?.hand.called ?? []).map((m) => ({
      tiles: tilesToGlyphs(m.tiles, mode),
    })),
    river: (gs?.hand.discarded ?? []).map((tt): RiverTileView => ({
      glyph: glyphForByte(tt.tile ?? 0, mode),
      isTedashi: deriveTileInfo(tt).isTedashi,
    })),
    handCount: freeTiles.length,
  };
}

/**
 * Orders seats so the local player is first (bottom), then clockwise. For
 * spectators/replay (no self match) seats are returned in natural order.
 */
export function orderedSeatViews(
  room: RoomModel,
  selfId: number | undefined,
  mode: TileMode,
  t: (key: string) => string,
): SeatView[] {
  const views = room.players
    .filter((p) => p.seat !== undefined)
    .map((p) => buildSeatView(room, p, selfId, mode, t));
  views.sort((a, b) => a.seat - b.seat);

  const selfIdx = views.findIndex((v) => v.isSelf);
  if (selfIdx <= 0) return views;
  return [...views.slice(selfIdx), ...views.slice(0, selfIdx)];
}

/** Round/table summary line, e.g. "East 1 · 2 honba · Wall Tiles: 70". */
export function roundSummary(
  room: RoomModel,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const info = room.info;
  if (!info) return '';
  const wind = t(`hud.${getWindKey(info.round)}`);
  const kyoku = (info.round % 4) + 1;
  const parts = [`${wind} ${kyoku}`];
  if (info.honba > 0) parts.push(`${info.honba} honba`);
  parts.push(t('hud.remainingTiles', { count: info.remainingTiles }));
  return parts.join(' · ');
}

/** Dora indicator glyphs for the info panel. */
export function doraGlyphs(room: RoomModel, mode: TileMode): TileGlyph[] {
  return tilesToGlyphs(room.info?.doras, mode);
}

/** A short human status label for a player in the room list. */
export function playerStatusLabel(
  status: UserStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case UserStatus.USER_STATUS_READY:
      return t('room.status.ready');
    case UserStatus.USER_STATUS_IN_ROOM:
      return t('room.status.waiting');
    case UserStatus.USER_STATUS_PLAYING:
      return t('room.status.playing');
    case UserStatus.USER_STATUS_NONE:
      return '';
    default:
      return '';
  }
}
