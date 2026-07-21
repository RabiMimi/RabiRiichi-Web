/**
 * Renders a horizontal row of tiles. Each tile is colored by suit; an optional
 * `selectedIndex` inverts a tile to show the keyboard cursor. Tiles are padded
 * to a consistent width so rows align regardless of tile mode.
 */
import { Box, Text } from 'ink';
import type { TileGlyph } from '../render/tileGlyph';
import type { RiverTileView } from '../render/tableView';
import { optionalColors } from './inkProps';

export interface TileRowProps {
  tiles: TileGlyph[];
  /** Index of the cursor-highlighted tile, or null for none. */
  selectedIndex?: number | null;
  /** Dim the whole row (e.g. opponents / inactive). */
  dim?: boolean;
}

export function TileRow({
  tiles,
  selectedIndex = null,
  dim = false,
}: TileRowProps) {
  if (tiles.length === 0) {
    return <Text dimColor>—</Text>;
  }
  return (
    <Box flexDirection="row">
      {tiles.map((glyph, i) => {
        const selected = i === selectedIndex;
        return (
          <Text
            key={i}
            {...optionalColors(
              selected ? 'black' : glyph.color,
              selected ? 'cyan' : undefined,
            )}
            dimColor={dim && !selected}
            bold={selected}
          >
            {' '}
            {glyph.text}{' '}
          </Text>
        );
      })}
    </Box>
  );
}

export interface RiverRowProps {
  tiles: RiverTileView[];
  /** Highlight the most recently discarded tile (last in the river). */
  highlightLast?: boolean;
}

/**
 * Renders a discard river. Tsumogiri tiles are dimmed; tedashi (hand) discards
 * are shown at full brightness with a leading `*` so they stand out even
 * without color. The latest discard can be highlighted.
 */
export function RiverRow({ tiles, highlightLast = false }: RiverRowProps) {
  if (tiles.length === 0) {
    return <Text dimColor>—</Text>;
  }
  return (
    <Box flexDirection="row">
      {tiles.map((rt, i) => {
        const isLast = highlightLast && i === tiles.length - 1;
        const tedashi = rt.isTedashi === true;
        return (
          <Text
            key={i}
            {...optionalColors(
              isLast ? 'black' : rt.glyph.color,
              isLast ? 'yellow' : undefined,
            )}
            // Tsumogiri (drawn-and-tossed) reads as "less deliberate", so dim
            // it; tedashi stays bright to flag a potential hand change.
            dimColor={!isLast && !tedashi}
            bold={isLast || tedashi}
          >
            {tedashi ? '*' : ' '}
            {rt.glyph.text}{' '}
          </Text>
        );
      })}
    </Box>
  );
}
