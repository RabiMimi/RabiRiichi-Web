/**
 * In-game table. Renders each seat (local player last/bottom), the round/dora
 * info, the action bar for the current inquiry, auto-play toggles, a turn timer,
 * and exit handling. Fully keyboard-driven.
 */
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Panel, KeyHints, Banner } from '../ui/chrome';
import { SeatPanel } from '../ui/SeatPanel';
import { TileRow } from '../ui/TileRow';
import { ActionBar } from '../ui/ActionBar';
import { ResultOverlay } from '../ui/ResultOverlay';
import { useApp } from '../ui/AppContext';
import { t, tc } from '../i18n';
import {
  orderedSeatViews,
  roundSummary,
  doraGlyphs,
} from '../render/tableView';
import { shouldShowResult } from '../render/resultView';
import { UserStatus } from '../../proto';
import { pollUntil } from '../../lib';

export function GameScreen() {
  const { client, settings } = useApp();
  const s = tc();
  const room = client.room;
  const [confirmExit, setConfirmExit] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Leaves the game mid-play: mark exiting, ask the server to move us out of
  // the room (status NONE), and poll until it takes effect. Mirrors the web
  // client's exit flow so the player returns to the lobby.
  const exitGame = () => {
    if (exiting) return;
    setExiting(true);
    setConfirmExit(false);
    client.beginExitGame();
    void (async () => {
      try {
        await client.updateRoom(UserStatus.USER_STATUS_NONE);
        await pollUntil(
          async () => {
            await client.refreshMyInfo();
            return client.self?.status === UserStatus.USER_STATUS_NONE;
          },
          { tries: 10, delayMs: 300 },
        );
      } catch {
        // If the server won't let us out cleanly, drop the connection so the
        // user is never stuck in the game view.
        client.close();
      } finally {
        setExiting(false);
      }
    })();
  };

  // Global gameplay shortcuts (auto-play toggles, exit). The action bar owns
  // arrow/enter while an inquiry is active; these single-letter toggles don't
  // conflict because they're distinct keys.
  useInput((input, key) => {
    if (confirmExit) {
      if (input.toLowerCase() === 'y') {
        exitGame();
      } else if (input.toLowerCase() === 'n' || key.escape) {
        setConfirmExit(false);
      }
      return;
    }
    switch (input) {
      case 'a':
        client.toggleAutoAgari();
        break;
      case 'c':
        client.toggleNoCalls();
        break;
      case 'd':
        client.toggleAutoDiscard();
        break;
      case 'n':
        client.toggleAutoNuki();
        break;
      case 'q':
        setConfirmExit(true);
        break;
    }
  });

  if (!room) return null;
  const seats = orderedSeatViews(room, client.self?.id, settings.tileMode, t);
  const dora = doraGlyphs(room, settings.tileMode);
  const showResult = shouldShowResult(
    room,
    client.currentInquiry?.mapped,
    client.isWaitingForProceed,
  );

  const onOff = (v: boolean) => (v ? s.game.autoOn : s.game.autoOff);
  const timer = client.actionTimeout > 0 ? `⏱ ${client.actionTimeout}s` : '';

  return (
    <Box flexDirection="column">
      <Panel borderColor="blue">
        <Box justifyContent="space-between">
          <Text bold color="cyan">
            {roundSummary(room, t)}
          </Text>
          {timer ? <Text color="yellow">{timer}</Text> : null}
        </Box>
        <Box>
          <Text dimColor>{t('hud.dora')}: </Text>
          <TileRow tiles={dora} />
        </Box>
      </Panel>

      {/* Opponents first (top), local player last (bottom). */}
      <Box flexDirection="column">
        {seats
          .slice(1)
          .reverse()
          .map((seat) => (
            <SeatPanel key={seat.seat} seat={seat} />
          ))}
        {seats[0] ? <SeatPanel seat={seats[0]} /> : null}
      </Box>

      {/* Auto-play toggle status. */}
      <Box marginTop={1}>
        <Text dimColor>{s.keys.auto}: </Text>
        <Text color={client.autoAgari ? 'green' : 'gray'}>
          [a]gari {onOff(client.autoAgari)}
        </Text>
        <Text> </Text>
        <Text color={client.noCalls ? 'green' : 'gray'}>
          no-[c]alls {onOff(client.noCalls)}
        </Text>
        <Text> </Text>
        <Text color={client.autoDiscard ? 'green' : 'gray'}>
          auto-[d]iscard {onOff(client.autoDiscard)}
        </Text>
        <Text> </Text>
        <Text color={client.autoNuki ? 'green' : 'gray'}>
          auto-[n]uki {onOff(client.autoNuki)}
        </Text>
      </Box>

      {/* When a hand concludes, the result screen stays up and owns the
          confirm (next-round) action. Otherwise show the normal action bar. */}
      {showResult ? (
        <ResultOverlay client={client} />
      ) : (
        <Box marginTop={1}>
          {client.currentInquiry ? (
            <ActionBar
              key={client.currentInquiry.messageId}
              client={client}
              mode={settings.tileMode}
            />
          ) : (
            <Text dimColor>{s.game.waiting}</Text>
          )}
        </Box>
      )}

      {confirmExit ? <Banner text={s.game.exitConfirm} tone="error" /> : null}
      {exiting ? <Banner text={t('hud.exitGame')} tone="info" /> : null}

      <KeyHints
        hints={[
          { keys: '↑↓←→/Enter', label: s.keys.select },
          { keys: 'a/c/d/n', label: s.keys.auto },
          { keys: 'q', label: s.keys.quit },
        ]}
      />
    </Box>
  );
}
