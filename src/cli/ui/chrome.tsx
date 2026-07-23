/**
 * Shared "chrome" components: a titled bordered {@link Panel} and a bottom
 * {@link KeyHints} bar that lists the currently-available keyboard shortcuts.
 * Together they give every screen a consistent frame and discoverable controls.
 */
import type { ReactNode } from 'react';
import { Box, Text } from 'ink';

export interface PanelProps {
  title?: string;
  children: ReactNode;
  borderColor?: string;
  flexGrow?: number;
}

export function Panel({
  title,
  children,
  borderColor = 'gray',
  flexGrow,
}: PanelProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      flexGrow={flexGrow}
    >
      {title ? (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {title}
          </Text>
        </Box>
      ) : null}
      {children}
    </Box>
  );
}

export interface KeyHint {
  keys: string;
  label: string;
}

export function KeyHints({ hints }: { hints: KeyHint[] }) {
  return (
    <Box marginTop={1}>
      {hints.map((h, i) => (
        <Box key={h.keys} marginRight={2}>
          <Text backgroundColor="gray" color="black">
            {' '}
            {h.keys}{' '}
          </Text>
          <Text dimColor> {h.label}</Text>
          {i < hints.length - 1 ? <Text> </Text> : null}
        </Box>
      ))}
    </Box>
  );
}

/** A one-line status/error banner. */
export function Banner({
  text,
  tone = 'info',
}: {
  text: string;
  tone?: 'info' | 'error' | 'success';
}) {
  if (!text) return null;
  const color =
    tone === 'error' ? 'red' : tone === 'success' ? 'green' : 'yellow';
  return (
    <Box marginTop={1}>
      <Text color={color}>{text}</Text>
    </Box>
  );
}
