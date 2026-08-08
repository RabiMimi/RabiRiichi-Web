/**
 * First-run tile legibility check. Shows the same sample hand in Unicode and
 * asks whether the glyphs render correctly. Unicode is preferred (default);
 * choosing "no" switches to ASCII. The decision is persisted so it is only
 * asked once (changeable later in Settings). Also reachable via a menu action.
 */
import { Box, Text, useInput } from 'ink';
import { Panel, KeyHints } from '../ui/chrome';
import { TileRow } from '../ui/TileRow';
import { sampleTileBytes, glyphForByte } from '../render/tileGlyph';
import { tc } from '../i18n';
import { useApp } from '../ui/AppContext';

export function StartupScreen({ onDone }: { onDone: () => void }) {
  const { updateSettings } = useApp();
  const s = tc();
  const sample = sampleTileBytes();
  const unicodeRow = sample.map((b) => glyphForByte(b, 'unicode'));
  const asciiRow = sample.map((b) => glyphForByte(b, 'ascii'));

  const choose = (tileMode: 'unicode' | 'ascii') => {
    updateSettings({ tileMode, tileModeConfirmed: true });
    onDone();
  };

  useInput((input, key) => {
    const ch = input.toLowerCase();
    if (ch === 'y' || key.return) {
      choose('unicode');
    } else if (ch === 'n' || ch === 'a') {
      choose('ascii');
    }
  });

  return (
    <Box flexDirection="column">
      <Panel title={s.appTitle} borderColor="magenta">
        <Text>{s.tileMode.prompt}</Text>
        <Box marginTop={1} marginBottom={1} flexDirection="column">
          <Box>
            <Text bold color="magenta">
              {s.tileMode.unicode}:{'  '}
            </Text>
            <TileRow tiles={unicodeRow} />
          </Box>
          <Box marginTop={1}>
            <Text bold color="magenta">
              {s.tileMode.ascii}:{'    '}
            </Text>
            <TileRow tiles={asciiRow} />
          </Box>
        </Box>
        <Text>{s.tileMode.hint}</Text>
      </Panel>
      <KeyHints
        hints={[
          { keys: 'Y/Enter', label: s.tileMode.unicode },
          { keys: 'N/A', label: s.tileMode.ascii },
        ]}
      />
    </Box>
  );
}
