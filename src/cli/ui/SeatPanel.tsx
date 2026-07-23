/**
 * Renders one player's area: name/points header (with dealer/current/riichi
 * markers), melds, hand (or backs), the just-drawn tile, and the discard river.
 * The local player's hand can show a discard cursor via `handCursor`.
 */
import { Box, Text } from 'ink';
import type { SeatView } from '../render/tableView';
import { TileRow, RiverRow } from './TileRow';
import { tc } from '../i18n';
import { optionalColors } from './inkProps';

export interface SeatPanelProps {
  seat: SeatView;
  /** Discard cursor index into the hand (self only), or null. */
  handCursor?: number | null;
}

export function SeatPanel({ seat, handCursor = null }: SeatPanelProps) {
  const s = tc();
  const markers = [
    seat.isDealer ? 'D' : null,
    seat.isRiichi ? 'R' : null,
    seat.isCurrent ? '●' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const headerColor = seat.isCurrent ? 'green' : seat.isSelf ? 'cyan' : 'white';

  return (
    <Box
      flexDirection="column"
      borderStyle={seat.isCurrent ? 'bold' : 'round'}
      borderColor={seat.isCurrent ? 'green' : 'gray'}
      paddingX={1}
    >
      <Box>
        <Text bold {...optionalColors(headerColor)}>
          {seat.name}
        </Text>
        {seat.isAi ? <Text color="magenta"> [AI]</Text> : null}
        <Text dimColor> · {seat.points}</Text>
        {markers ? <Text color="yellow"> {markers}</Text> : null}
      </Box>

      {seat.melds.length > 0 ? (
        <Box>
          <Text dimColor>{s.game.melds}: </Text>
          {seat.melds.map((m, i) => (
            <Box key={i} marginRight={1}>
              <TileRow tiles={m.tiles} dim />
            </Box>
          ))}
        </Box>
      ) : null}

      <Box>
        <Text dimColor>{s.game.hand}: </Text>
        <TileRow tiles={seat.hand} selectedIndex={handCursor} />
        {seat.drawn ? (
          <Box marginLeft={1}>
            <Text dimColor>+ </Text>
            <TileRow tiles={[seat.drawn]} />
          </Box>
        ) : null}
      </Box>

      {/* Rivers are always shown (including opponents') — they're the primary
          read on the game. The latest discard is highlighted. */}
      <Box>
        <Text dimColor>{s.game.river}: </Text>
        <RiverRow tiles={seat.river} highlightLast />
      </Box>
    </Box>
  );
}
