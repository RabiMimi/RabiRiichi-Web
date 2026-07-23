/**
 * A keyboard-navigable vertical menu. Up/down (or j/k) move the cursor, Enter
 * selects. Optional number hotkeys (1-9) jump directly to an item. Purely
 * presentational + input handling; callers own the item list and the action.
 */
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { optionalColors } from './inkProps';

export interface MenuItem {
  key: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export interface MenuProps {
  items: MenuItem[];
  onSelect: (item: MenuItem, index: number) => void;
  /** Enable 1-9 number hotkeys for the first nine items. */
  numbered?: boolean;
  isActive?: boolean;
}

export function Menu({
  items,
  onSelect,
  numbered = false,
  isActive = true,
}: MenuProps) {
  const [cursor, setCursor] = useState(0);
  const clamped = Math.min(cursor, Math.max(0, items.length - 1));

  useInput(
    (input, key) => {
      if (items.length === 0) return;
      if (key.upArrow || input === 'k') {
        setCursor((c) => (c - 1 + items.length) % items.length);
      } else if (key.downArrow || input === 'j') {
        setCursor((c) => (c + 1) % items.length);
      } else if (key.return) {
        const item = items[clamped];
        if (item && !item.disabled) onSelect(item, clamped);
      } else if (numbered && /^[1-9]$/.test(input)) {
        const idx = Number(input) - 1;
        const item = items[idx];
        if (item && !item.disabled) {
          setCursor(idx);
          onSelect(item, idx);
        }
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        const selected = i === clamped;
        const prefix = numbered && i < 9 ? `${i + 1}. ` : '';
        return (
          <Box key={item.key}>
            <Text
              {...optionalColors(
                item.disabled ? 'gray' : selected ? 'black' : undefined,
                selected ? 'cyan' : undefined,
              )}
              bold={selected}
              dimColor={item.disabled === true}
            >
              {selected ? '▶ ' : '  '}
              {prefix}
              {item.label}
            </Text>
            {item.hint ? <Text dimColor> {item.hint}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}
