/**
 * Flattened interactive action bar for a pending inquiry.
 *
 * When it's the player's turn to discard, the hand is a directly-navigable tile
 * row (←/→ + Enter) — no submenu. Other actions (Skip, Ron/Tsumo, Pon/Chii/Kan,
 * Riichi, etc.) are numbered hotkeys shown alongside; pressing the number
 * invokes them immediately. Only genuinely ambiguous choices open a secondary
 * step: a call with more than one tile group, or Riichi (which then restricts
 * the same tile row to its legal discards).
 */
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RabiRiichiClient } from '../../net/client';
import type { ActionOption } from '../../domain/inquiry';
import type { IGameTileMsg } from '../../proto';
import { TileRow } from './TileRow';
import { glyphForByte, type TileMode } from '../render/tileGlyph';
import { followUpFor, autoChoiceFor, actionLabel } from '../render/actionBar';
import { t, tc } from '../i18n';
import { optionalColors } from './inkProps';

export interface ActionBarProps {
  client: RabiRiichiClient;
  mode: TileMode;
}

// A pending secondary step: pick one tile group for a multi-group call.
interface GroupStep {
  action: Extract<ActionOption, { type: 'chii' | 'pon' | 'kan' }>;
}

export function ActionBar({ client, mode }: ActionBarProps) {
  const s = tc();
  const inquiry = client.currentInquiry;
  // Local UI state; the parent remounts per inquiry (keyed by messageId).
  const [tileCursor, setTileCursor] = useState(0);
  const [groupCursor, setGroupCursor] = useState(0);
  const [groupStep, setGroupStep] = useState<GroupStep | null>(null);
  const [riichiMode, setRiichiMode] = useState(false);

  const mapped = inquiry?.mapped;

  const submit = (action: ActionOption, choice?: number) => {
    void client.submitInquiryResponse(action, choice);
  };

  // The discardable tiles (hand + drawn), restricted to the legal set for the
  // active discard type (normal play-tile, or riichi's narrower set).
  const selfSeat = client.selfSeat;
  const self = client.room?.players.find((p) => p.seat === selfSeat);
  const hand = self?.gameState?.hand;
  const riichiBtn = mapped?.buttons.find((b) => b.type === 'riichi');
  const legalIds = new Set(
    riichiMode && riichiBtn?.type === 'riichi'
      ? riichiBtn.legalTiles
      : (mapped?.playTile?.legalTiles ?? []),
  );
  const discardTiles: IGameTileMsg[] = [
    ...(hand?.freeTiles ?? []),
    ...(hand?.pendingTile ? [hand.pendingTile] : []),
  ].filter((tt) => legalIds.has(tt.traceId ?? -1));
  const canDiscard = discardTiles.length > 0 && mapped?.playTile !== undefined;

  // Buttons offered as numbered hotkeys. Riichi is handled specially (it arms
  // riichi discard mode rather than submitting immediately).
  const hotkeys = mapped?.buttons ?? [];

  const invokeButton = (action: ActionOption) => {
    if (action.type === 'riichi') {
      setRiichiMode(true);
      setTileCursor(0);
      return;
    }
    const follow = followUpFor(action);
    if (
      follow.kind === 'group' &&
      (action.type === 'chii' || action.type === 'pon' || action.type === 'kan')
    ) {
      setGroupCursor(0);
      setGroupStep({ action });
      return;
    }
    submit(action, autoChoiceFor(action));
  };

  const discardAt = (idx: number) => {
    const tt = discardTiles[idx];
    if (!tt) return;
    if (riichiMode && riichiBtn?.type === 'riichi') {
      submit(riichiBtn, tt.traceId ?? 0);
    } else if (mapped?.playTile) {
      const action: ActionOption = {
        type: 'play-tile',
        label: s.game.chooseTile,
        actionIndex: mapped.playTile.actionIndex,
        legalTiles: mapped.playTile.legalTiles,
      };
      submit(action, tt.traceId ?? 0);
    }
  };

  useInput((input, key) => {
    // Secondary step: choosing a call group.
    if (groupStep) {
      const groups = groupStep.action.tileGroups;
      if (key.escape) setGroupStep(null);
      else if (key.leftArrow || input === 'h')
        setGroupCursor((c) => (c - 1 + groups.length) % groups.length);
      else if (key.rightArrow || input === 'l')
        setGroupCursor((c) => (c + 1) % groups.length);
      else if (key.return) {
        const g = groups[groupCursor];
        if (g) submit(groupStep.action, g.index);
      }
      return;
    }

    // Riichi: Esc cancels back to normal discard.
    if (riichiMode && key.escape) {
      setRiichiMode(false);
      setTileCursor(0);
      return;
    }

    // Number hotkeys invoke the corresponding button directly (flattened).
    if (/^[1-9]$/.test(input)) {
      const action = hotkeys[Number(input) - 1];
      if (action) invokeButton(action);
      return;
    }

    // Tile cursor navigation + discard.
    if (canDiscard) {
      if (key.leftArrow || input === 'h')
        setTileCursor(
          (c) => (c - 1 + discardTiles.length) % discardTiles.length,
        );
      else if (key.rightArrow || input === 'l')
        setTileCursor((c) => (c + 1) % discardTiles.length);
      else if (key.return) discardAt(tileCursor);
    }
  });

  // No active inquiry: render nothing (hooks above always run to satisfy the
  // rules of hooks).
  if (!mapped) return null;

  // Group-selection step view.
  if (groupStep) {
    return (
      <Box flexDirection="column">
        <Text bold color="green">
          {s.game.chooseGroup}
        </Text>
        {groupStep.action.tileGroups.map((g, i) => (
          <Box key={g.index}>
            <Text
              {...optionalColors(
                i === groupCursor ? 'black' : undefined,
                i === groupCursor ? 'cyan' : undefined,
              )}
            >
              {i === groupCursor ? '▶ ' : '  '}
            </Text>
            <TileRow tiles={g.tiles.map((tt) => glyphForByte(tt.tile, mode))} />
          </Box>
        ))}
        <Text dimColor>←/→ · Enter · Esc</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color={riichiMode ? 'yellow' : 'green'}>
        {riichiMode ? s.game.riichiSelect : s.game.yourTurn}
      </Text>

      {canDiscard ? (
        <Box>
          <Text dimColor>{s.game.chooseTile}: </Text>
          <TileRow
            tiles={discardTiles.map((tt) => glyphForByte(tt.tile ?? 0, mode))}
            selectedIndex={tileCursor}
          />
        </Box>
      ) : null}

      {/* Flattened action hotkeys. */}
      {hotkeys.length > 0 ? (
        <Box marginTop={canDiscard ? 1 : 0}>
          {hotkeys.map((b, i) => (
            <Box key={i} marginRight={2}>
              <Text backgroundColor="gray" color="black">
                {' '}
                {i + 1}{' '}
              </Text>
              <Text color={b.type === 'riichi' ? 'yellow' : 'cyan'}>
                {' '}
                {actionLabel(b, t)}
              </Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
