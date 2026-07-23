/**
 * Replay viewer: prompts for a game ID, fetches the log via the client, then
 * lets the user step through events (←/→), jump to the end, or exit. Renders
 * the same table view as live play.
 */
import { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Panel, KeyHints, Banner } from '../ui/chrome';
import { TextPrompt } from '../ui/TextPrompt';
import { SeatPanel } from '../ui/SeatPanel';
import { useApp } from '../ui/AppContext';
import { t, tc, tFunction } from '../i18n';
import { formatError } from '../../lib';
import { ReplayController } from '../replayController';
import { orderedSeatViews, roundSummary } from '../render/tableView';

export function ReplayScreen({ onBack }: { onBack: () => void }) {
  const { client, settings } = useApp();
  const s = tc();
  const controller = useMemo(() => new ReplayController(client), [client]);
  const [phase, setPhase] = useState<'prompt' | 'loading' | 'viewing'>(
    'prompt',
  );
  const [error, setError] = useState('');

  const exit = () => {
    controller.stop();
    onBack();
  };

  const load = (gameId: string) => {
    const id = gameId.trim();
    if (!id) return;
    setPhase('loading');
    setError('');
    client
      .fetchReplay(id)
      .then((log) => {
        controller.load(log, 0);
        setPhase('viewing');
      })
      .catch((e: unknown) => {
        setError(formatError(e, tFunction));
        setPhase('prompt');
      });
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        exit();
        return;
      }
      if (phase !== 'viewing') return;
      if (key.rightArrow || input === 'l') controller.stepForward();
      else if (key.leftArrow || input === 'h') controller.stepBack();
      else if (input === 'e') controller.playToEnd();
    },
    { isActive: phase !== 'prompt' },
  );

  const room = client.room;
  const seats = room
    ? orderedSeatViews(room, client.self?.id, settings.tileMode, t)
    : [];

  return (
    <Box flexDirection="column">
      <Panel title={s.menu.replay} borderColor="magenta">
        {phase === 'prompt' ? (
          <TextPrompt label={t('replay.gameId') || 'Game ID'} onSubmit={load} />
        ) : null}
        {phase === 'loading' ? (
          <Text color="yellow">{s.connect.connecting}</Text>
        ) : null}
        {phase === 'viewing' && room ? (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {roundSummary(room, t)}
            </Text>
            <Text dimColor>
              {controller.progress} / {controller.total}
            </Text>
            <Box flexDirection="column" marginTop={1}>
              {seats.map((seat) => (
                <SeatPanel key={seat.seat} seat={seat} />
              ))}
            </Box>
          </Box>
        ) : null}
        <Banner text={error} tone="error" />
      </Panel>
      <KeyHints
        hints={[
          { keys: '←/→', label: s.keys.move },
          { keys: 'e', label: 'end' },
          { keys: 'Esc', label: s.keys.back },
        ]}
      />
    </Box>
  );
}
