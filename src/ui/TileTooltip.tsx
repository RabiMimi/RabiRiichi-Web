import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useHoveredTileTraceId,
  useSelectedTileTraceId,
} from '../state/store';
import type { TFunction } from 'i18next';
import { Tile } from '../domain/tile';
import { deriveTileInfo, type TileInfoFacts } from '../domain/tileInfo';

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

  const tileName = useMemo(() => {
    if (tileInfo?.tile == null || tileInfo.tile === 0) return null;
    try {
      return Tile.fromByte(tileInfo.tile).toString();
    } catch {
      return null;
    }
  }, [tileInfo]);

  if (!tileInfo || !facts || !tileName) {
    return null;
  }

  const { discardedFrom, isClaimed } = facts;

  const discarder =
    discardedFrom != null
      ? room?.players.find((p) => p.seat === discardedFrom)
      : null;
  const discarderName = discarder?.nickname;

  const junCapsule = buildJunCapsule(facts, t);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(15, 20, 16, 0.96)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '4px',
        padding: '3px 8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '0.68rem',
        lineHeight: 1.2,
        color: '#ffffff',
        backdropFilter: 'blur(8px)',
        height: '24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Tile Face Badge */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#10b981',
          color: '#ffffff',
          borderRadius: '2px',
          padding: '1px 4px',
          fontSize: '0.72rem',
          fontWeight: 800,
        }}
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: junCapsule.background,
            borderRadius: '2px',
            padding: '1px 5px',
            color: junCapsule.color,
            fontWeight: 700,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(239, 68, 68, 0.12)',
            borderRadius: '2px',
            padding: '1px 4px',
            color: '#fca5a5',
            gap: '3px',
          }}
        >
          <span style={{ opacity: 0.85 }}>
            {t('tileTooltip.claimedFrom', 'Claimed')}
          </span>
          <span style={{ fontWeight: 700 }}>{discarderName}</span>
        </div>
      )}
    </div>
  );
}
