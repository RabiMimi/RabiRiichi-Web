/**
 * Settings: tile display mode (Unicode/ASCII), UI language, and animation speed.
 * Changes persist immediately (tile mode + language via CLI settings, animation
 * speed via the shared client settings).
 */
import { Box, Text, useInput } from 'ink';
import { Panel, KeyHints } from '../ui/chrome';
import { Menu, type MenuItem } from '../ui/Menu';
import { TileRow } from '../ui/TileRow';
import { sampleTileBytes, glyphForByte } from '../render/tileGlyph';
import { useApp } from '../ui/AppContext';
import {
  tc,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  currentLanguage,
} from '../i18n';

const SPEEDS = [0.5, 1, 1.5, 2, 3];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { client, settings, updateSettings } = useApp();
  const s = tc();

  const nextLanguage = () => {
    const idx = SUPPORTED_LANGUAGES.indexOf(currentLanguage());
    const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
    if (next) updateSettings({ language: next });
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(client.animationSpeed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    if (next !== undefined) client.setAnimationSpeed(next);
  };

  const items: MenuItem[] = [
    {
      key: 'tiles',
      label: s.tileMode.change,
      hint: `‹ ${settings.tileMode === 'unicode' ? s.tileMode.unicode : s.tileMode.ascii} ›`,
    },
    {
      key: 'language',
      label: s.language,
      hint: `‹ ${LANGUAGE_LABELS[currentLanguage()]} ›`,
    },
    {
      key: 'speed',
      label: s.animationSpeed,
      hint: `‹ ${client.animationSpeed}x ›`,
    },
    { key: 'back', label: s.keys.back },
  ];

  const onSelect = (item: MenuItem) => {
    switch (item.key) {
      case 'tiles':
        updateSettings({
          tileMode: settings.tileMode === 'unicode' ? 'ascii' : 'unicode',
        });
        break;
      case 'language':
        nextLanguage();
        break;
      case 'speed':
        cycleSpeed();
        break;
      case 'back':
        onBack();
        break;
    }
  };

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const preview = sampleTileBytes()
    .slice(0, 7)
    .map((b) => glyphForByte(b, settings.tileMode));

  return (
    <Box flexDirection="column">
      <Panel title={s.menu.settings} borderColor="magenta">
        <Menu items={items} numbered onSelect={onSelect} />
        <Box marginTop={1}>
          <Text dimColor>Preview: </Text>
          <TileRow tiles={preview} />
        </Box>
      </Panel>
      <KeyHints
        hints={[
          { keys: '↑↓', label: s.keys.move },
          { keys: 'Enter', label: s.keys.select },
          { keys: 'Esc', label: s.keys.back },
        ]}
      />
    </Box>
  );
}
