/**
 * Round/game result summary. Stays visible while the hand is concluded and the
 * server awaits the player's confirmation (the `next-round` inquiry). Shows each
 * player's point delta and an inline, localized Confirm action — the result
 * screen is not dismissed to ask for confirmation elsewhere.
 */
import { Box, Text, useInput } from 'ink';
import type { RabiRiichiClient } from '../../net/client';
import { getPlayerDisplayName } from '../../domain/model';
import { t } from '../i18n';
import { buildResultView } from '../render/resultView';
import { optionalColors } from './inkProps';

export function ResultOverlay({ client }: { client: RabiRiichiClient }) {
  const room = client.room;

  const nextRound = client.currentInquiry?.mapped.buttons.find(
    (b) => b.type === 'next-round',
  );

  useInput(
    (input, key) => {
      if ((key.return || input === ' ') && nextRound) {
        void client.submitInquiryResponse(nextRound);
      }
    },
    { isActive: nextRound !== undefined },
  );

  if (!room) return null;
  const view = buildResultView(room, (p) => getPlayerDisplayName(p, t));
  const title = view.kind === 'agari' ? t('result.agari') : t('result.draw');

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={1}
      marginTop={1}
    >
      <Text bold color="yellow">
        {title}
      </Text>
      {view.rows.map((row) => {
        const color = row.delta > 0 ? 'green' : row.delta < 0 ? 'red' : 'gray';
        return (
          <Box key={row.id}>
            <Text>{row.name}: </Text>
            <Text {...optionalColors(color)}>
              {row.delta > 0 ? '+' : ''}
              {row.delta}
            </Text>
            <Text dimColor> ({row.points})</Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        {nextRound ? (
          <Text backgroundColor="green" color="black">
            {' '}
            ↵ {t('result.confirm')}{' '}
          </Text>
        ) : (
          <Text dimColor>{t('result.waitingForNextRound')}</Text>
        )}
      </Box>
    </Box>
  );
}
