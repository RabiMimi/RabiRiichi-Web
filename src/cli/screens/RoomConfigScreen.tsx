/**
 * Pre-create room configuration form. Mirrors the essential options from the
 * web client's Create Room panel (player count, rounds, min han, action
 * timeout, starting points, tile set). ↑/↓ move between fields, ←/→ change a
 * value, Enter creates the room, Esc cancels back to the lobby.
 */
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Panel, KeyHints } from '../ui/chrome';
import { useApp } from '../ui/AppContext';
import { t, tc } from '../i18n';
import {
  type RoomConfigChoices,
  DEFAULT_ROOM_CONFIG,
  TILE_SET_OPTIONS,
} from '../render/roomConfig';
import { optionalColors } from '../ui/inkProps';

const PLAYER_COUNTS = [2, 3, 4];
const ROUNDS = [1, 2];
const HANS = [1, 2];
const TIMEOUTS = [10, 15, 20, 30, 60];
const POINTS = [25000, 30000, 35000];

function cycle<T>(list: readonly T[], current: T, dir: 1 | -1): T {
  const idx = list.indexOf(current);
  const base = idx < 0 ? 0 : idx;
  return list[(base + dir + list.length) % list.length] ?? current;
}

interface FieldRow {
  key: keyof RoomConfigChoices;
  label: string;
  display: string;
}

export function RoomConfigScreen({
  onCreate,
  onCancel,
}: {
  onCreate: (choices: RoomConfigChoices) => void;
  onCancel: () => void;
}) {
  const { store } = useApp();
  const s = tc();
  const [choices, setChoices] =
    useState<RoomConfigChoices>(DEFAULT_ROOM_CONFIG);
  const [field, setField] = useState(0);

  void store; // reserved for future "remember last config"

  const rows: FieldRow[] = [
    {
      key: 'playerCount',
      label: t('lobby.players'),
      display: t(`playersOpt.${choices.playerCount}`),
    },
    {
      key: 'totalRound',
      label: t('lobby.rounds'),
      display: t(`roundsOpt.${choices.totalRound}`),
    },
    {
      key: 'minHan',
      label: t('lobby.minHan'),
      display: t(`hanOpt.${choices.minHan}`),
    },
    {
      key: 'actionTimeout',
      label: t('lobby.actionTimeout'),
      display: `${choices.actionTimeout}s`,
    },
    {
      key: 'initialPoints',
      label: t('lobby.initialPoints'),
      display: String(choices.initialPoints),
    },
    {
      key: 'tileSet',
      label: t('lobby.tileSet'),
      display: choices.tileSet,
    },
  ];

  const change = (dir: 1 | -1) => {
    const row = rows[field];
    if (!row) return;
    setChoices((c) => {
      switch (row.key) {
        case 'playerCount':
          return {
            ...c,
            playerCount: cycle(PLAYER_COUNTS, c.playerCount, dir),
          };
        case 'totalRound':
          return { ...c, totalRound: cycle(ROUNDS, c.totalRound, dir) };
        case 'minHan':
          return { ...c, minHan: cycle(HANS, c.minHan, dir) };
        case 'actionTimeout':
          return {
            ...c,
            actionTimeout: cycle(TIMEOUTS, c.actionTimeout, dir),
          };
        case 'initialPoints':
          return { ...c, initialPoints: cycle(POINTS, c.initialPoints, dir) };
        case 'tileSet':
          return { ...c, tileSet: cycle(TILE_SET_OPTIONS, c.tileSet, dir) };
      }
    });
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.upArrow || input === 'k') {
      setField((f) => (f - 1 + rows.length) % rows.length);
    } else if (key.downArrow || input === 'j') {
      setField((f) => (f + 1) % rows.length);
    } else if (key.leftArrow || input === 'h') {
      change(-1);
    } else if (key.rightArrow || input === 'l') {
      change(1);
    } else if (key.return) {
      onCreate(choices);
    }
  });

  return (
    <Box flexDirection="column">
      <Panel title={s.config.title} borderColor="green">
        {rows.map((row, i) => {
          const selected = i === field;
          return (
            <Box key={row.key}>
              <Text {...optionalColors(selected ? 'cyan' : undefined)}>
                {selected ? '▶ ' : '  '}
                {row.label.padEnd(18)}
              </Text>
              <Text bold {...optionalColors(selected ? 'yellow' : undefined)}>
                ‹ {row.display} ›
              </Text>
            </Box>
          );
        })}
        <Box marginTop={1}>
          <Text color="green">↵ {s.config.create}</Text>
        </Box>
      </Panel>
      <KeyHints
        hints={[
          { keys: '↑↓', label: s.keys.move },
          { keys: '←/→', label: s.keys.select },
          { keys: 'Enter', label: s.config.create },
          { keys: 'Esc', label: s.keys.back },
        ]}
      />
    </Box>
  );
}
