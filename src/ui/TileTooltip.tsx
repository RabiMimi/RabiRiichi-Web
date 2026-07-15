import React, { useMemo, useState, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useHoveredTileTraceId,
  useSelectedTileTraceId,
} from '../state/store';
import type { TFunction } from 'i18next';
import { Tile, TileSuit } from '../domain/tile';
import { deriveTileInfo, type TileInfoFacts } from '../domain/tileInfo';
import { getPlayerDisplayName } from '../domain/model';

interface JunCapsule {
  /** Optional leading label (e.g. "Drawn"); omitted for the discard arrow form. */
  readonly label: string | null;
  readonly value: string;
  readonly background: string;
  readonly color: string;
}

const CAPSULE_TSUMOGIRI = {
  background: 'rgba(120, 120, 120, 0.25)',
  color: '#e5e7eb',
} as const;
const CAPSULE_TEDASHI = {
  background: 'rgba(245, 158, 11, 0.22)',
  color: '#fbbf24',
} as const;
const CAPSULE_IN_HAND = {
  background: 'rgba(59, 130, 246, 0.12)',
  color: '#93c5fd',
} as const;

/**
 * Condenses a tile's drawn/discarded jun into one compact capsule:
 * - discarded: "{drawn}→{discard}" (or "→{discard}" for a starting-hand tile),
 *   tinted by tedashi/tsumogiri;
 * - still in hand: its drawn jun;
 * - starting hand: an "Initial" marker.
 * Returns null when there is nothing meaningful to show (e.g. a claimed tile).
 */
function buildJunCapsule(
  facts: TileInfoFacts,
  t: TFunction,
): JunCapsule | null {
  const { drawnJun, discardJun, isTedashi } = facts;
  const junNum = (jun: number): string => t('tileTooltip.junNum', { jun });

  if (discardJun != null) {
    const drawnPart =
      drawnJun != null
        ? junNum(drawnJun)
        : t('tileTooltip.initialHand', 'Initial hand');
    const tint = isTedashi ? CAPSULE_TEDASHI : CAPSULE_TSUMOGIRI;
    return {
      label: isTedashi
        ? t('discardReasons.tedashi', 'Tedashi')
        : t('discardReasons.tsumogiri', 'Tsumogiri'),
      value: `${drawnPart}→${junNum(discardJun)}`,
      ...tint,
    };
  }

  return {
    label: drawnJun != null ? t('tileTooltip.drawnLabel', 'Drawn') : null,
    value:
      drawnJun != null
        ? junNum(drawnJun)
        : t('tileTooltip.initialHand', 'Initial hand'),
    ...CAPSULE_IN_HAND,
  };
}

export function TileTooltip(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const hoveredTraceId = useHoveredTileTraceId();
  const selectedTraceId = useSelectedTileTraceId();

  const traceId = hoveredTraceId ?? selectedTraceId;

  const tileInfo = useMemo(() => {
    if (!room?.tileRegistry || !traceId || traceId <= 0) return null;
    return room.tileRegistry.get(traceId) ?? null;
  }, [room, traceId]);

  const facts = useMemo(
    () => (tileInfo ? deriveTileInfo(tileInfo) : null),
    [tileInfo],
  );

  const tileInstance = useMemo(() => {
    if (tileInfo?.tile == null || tileInfo.tile === 0) return null;
    try {
      return Tile.fromByte(tileInfo.tile);
    } catch {
      return null;
    }
  }, [tileInfo]);

  const tileName = useMemo(() => {
    return tileInstance ? tileInstance.toString() : null;
  }, [tileInstance]);

  const badgeBackground = useMemo(() => {
    if (!tileInstance) return '#10b981';
    switch (tileInstance.suit) {
      case TileSuit.M:
        return '#dc2626'; // Red/Orange for Characters
      case TileSuit.P:
        return '#2563eb'; // Blue for Circles
      case TileSuit.S:
        return '#10b981'; // Green for Bamboos
      case TileSuit.Z:
        return '#8b5cf6'; // Purple for Honors
      default:
        return '#6b7280';
    }
  }, [tileInstance]);

  // Adjust for screen bounds overflow
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Check bounds in screen space
    const rect = el.getBoundingClientRect();
    const padding = 12;
    let dx = 0;
    let dy = 0;

    if (rect.left < padding) {
      dx = padding - rect.left;
    } else if (rect.right > window.innerWidth - padding) {
      dx = window.innerWidth - padding - rect.right;
    }

    if (rect.top < padding) {
      // If it overflows the top, shift down below the tile.
      // - The original offset was negative (shifting it up).
      // - Shifting it down by the height of tooltip + height of tile + margins.
      // E.g., if mobile shifted up by -36px, shifting down by +84px flips it.
      // E.g., if desktop shifted up by -60px, shifting down by +136px flips it.
      const shiftDown = window.innerWidth >= 1024 ? 136 : 84;
      dy = shiftDown;
    }

    setOffset({ x: dx, y: dy });
  }, [tileInfo, facts, tileName]);

  if (!tileInfo || !facts || !tileName) {
    return null;
  }

  const { discardedFrom, isClaimed } = facts;

  const discarder =
    discardedFrom != null
      ? room?.players.find((p) => p.seat === discardedFrom)
      : null;
  const discarderName = discarder ? getPlayerDisplayName(discarder, t) : null;

  const junCapsule = buildJunCapsule(facts, t);

  return (
    <div
      ref={containerRef}
      className="tile-tooltip-container"
      style={{
        transform: `translate(calc(-50% + ${offset.x}px), calc(var(--tile-tooltip-y-offset) + ${offset.y}px))`,
        position: 'absolute',
      }}
    >
      {/* Tile Face Badge */}
      <span
        className="tile-tooltip-badge"
        style={{ background: badgeBackground }}
      >
        {tileName}
      </span>

      {/*
        A single compact "life of the tile" capsule. Discarded tiles read
        "{drawn}→{discard}" with the tedashi/tsumogiri tint; a tile still in hand
        reads its drawn jun; a starting-hand tile reads "Initial".
      */}
      {junCapsule && (
        <div
          className="tile-tooltip-capsule"
          style={{
            background: junCapsule.background,
            color: junCapsule.color,
          }}
        >
          {junCapsule.label != null && (
            <span style={{ opacity: 0.85, fontWeight: 600 }}>
              {junCapsule.label}
            </span>
          )}
          <span>{junCapsule.value}</span>
        </div>
      )}

      {isClaimed && discarderName && (
        <div className="tile-tooltip-claimed">
          <span style={{ opacity: 0.85 }}>
            {t('tileTooltip.claimedFrom', 'Claimed')}
          </span>
          <span style={{ fontWeight: 700 }}>{discarderName}</span>
        </div>
      )}
    </div>
  );
}
