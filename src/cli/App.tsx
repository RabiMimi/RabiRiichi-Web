/**
 * Root router. Derives the active screen from client state (connection status,
 * room, in-game) plus a small local navigation state for pre-connection and
 * overlay screens (startup tile check, settings, replay). Re-renders on every
 * client `onChange` via {@link useClientState}.
 */
import { useState, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import { useApp } from './ui/AppContext';
import { useClientState } from './ui/useClient';
import { StartupScreen } from './screens/StartupScreen';
import { ConnectScreen } from './screens/ConnectScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { RoomScreen } from './screens/RoomScreen';
import { GameScreen } from './screens/GameScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ReplayScreen } from './screens/ReplayScreen';
import { tc } from './i18n';
import { UserStatus } from '../proto';

type Nav = 'main' | 'settings' | 'replay';

export function App() {
  const { client, settings } = useApp();
  useClientState(client);
  const s = tc();

  const [startupDone, setStartupDone] = useState(settings.tileModeConfirmed);
  const [nav, setNav] = useState<Nav>('main');

  // First-run (or unconfirmed) tile legibility check.
  if (!startupDone) {
    return <StartupScreen onDone={() => setStartupDone(true)} />;
  }

  if (nav === 'settings') {
    return <SettingsScreen onBack={() => setNav('main')} />;
  }
  if (nav === 'replay') {
    return <ReplayScreen onBack={() => setNav('main')} />;
  }

  const connected = client.connectionStatus === 'connected';
  const room = client.room;

  // Header shows connection + ping status on every connected screen.
  const header = connected ? (
    <Box marginBottom={1}>
      <Text color="green">● {s.status.connected}</Text>
      {client.ping >= 0 ? (
        <Text dimColor>
          {' '}
          · {s.status.ping} {client.ping}ms
        </Text>
      ) : null}
    </Box>
  ) : null;

  let screen: ReactNode;
  if (!connected) {
    screen = <ConnectScreen onBack={() => setNav('main')} />;
  } else if (!room) {
    screen = (
      <LobbyScreen
        onOpenSettings={() => setNav('settings')}
        onOpenReplay={() => setNav('replay')}
      />
    );
  } else if (isInGame(room, client.self?.status)) {
    screen = <GameScreen />;
  } else {
    screen = <RoomScreen />;
  }

  return (
    <Box flexDirection="column">
      {header}
      {screen}
    </Box>
  );
}

/** A game is in progress once round info exists or the player is playing. */
function isInGame(
  room: { info: unknown } | null,
  selfStatus: UserStatus | undefined,
): boolean {
  if (!room) return false;
  return room.info != null || selfStatus === UserStatus.USER_STATUS_PLAYING;
}
