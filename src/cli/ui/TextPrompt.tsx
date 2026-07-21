/**
 * A minimal single-line text input for Ink. Supports typing, backspace, and
 * Enter to submit. Masks input when `password` is set. Ink 7 ships no text
 * input, so this covers the small needs of the connect/login/chat forms without
 * an extra dependency.
 */
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { optionalColors } from './inkProps';

export interface TextPromptProps {
  label: string;
  initialValue?: string;
  password?: boolean;
  isActive?: boolean;
  onSubmit: (value: string) => void;
  onChange?: (value: string) => void;
}

export function TextPrompt({
  label,
  initialValue = '',
  password = false,
  isActive = true,
  onSubmit,
  onChange,
}: TextPromptProps) {
  const [value, setValue] = useState(initialValue);

  useInput(
    (input, key) => {
      if (key.return) {
        onSubmit(value);
        return;
      }
      if (key.backspace || key.delete) {
        setValue((v) => {
          const next = v.slice(0, -1);
          onChange?.(next);
          return next;
        });
        return;
      }
      // Ignore control keys; append printable characters only.
      if (input && !key.ctrl && !key.meta && !key.escape) {
        setValue((v) => {
          const next = v + input;
          onChange?.(next);
          return next;
        });
      }
    },
    { isActive },
  );

  const shown = password ? '*'.repeat(value.length) : value;

  return (
    <Box>
      <Text bold {...optionalColors(isActive ? 'cyan' : undefined)}>
        {label}:{' '}
      </Text>
      <Text>{shown}</Text>
      {isActive ? <Text color="cyan">▏</Text> : null}
    </Box>
  );
}
