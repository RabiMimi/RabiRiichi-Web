/**
 * Lobby: create a room (default config), join by ID, open settings, view a
 * replay, or log out. Shown when connected but not in a room.
 */
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Panel, KeyHints, Banner } from '../ui/chrome';
import { Menu, type MenuItem } from '../ui/Menu';
import { TextPrompt } from '../ui/TextPrompt';
import { useApp } from '../ui/AppContext';
import { t, tc, tFunction } from '../i18n';
import { formatError } from '../../lib';
import { RoomConfigScreen } from './RoomConfigScreen';
import { buildRoomConfig } from '../render/roomConfig';

type SubView = 'menu' | 'join' | 'config';

export function LobbyScreen({
  onOpenSettings,
  onOpenReplay,
}: {
  onOpenSettings: () => void;
  onOpenReplay: () => void;
}) {
  const { client } = useApp();
  const s = tc();
  const [view, setView] = useState<SubView>('menu');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const guard = (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    fn()
      .catch((e: unknown) => setError(formatError(e, tFunction)))
      .finally(() => setBusy(false));
  };

  const items: MenuItem[] = [
    { key: 'create', label: t('lobby.createRoom') },
    { key: 'join', label: t('lobby.joinRoom') },
    { key: 'settings', label: s.menu.settings },
    { key: 'replay', label: s.menu.replay },
    { key: 'logout', label: t('lobby.logout') },
  ];

  const onSelect = (item: MenuItem) => {
    switch (item.key) {
      case 'create':
        setView('config');
        break;
      case 'join':
        setView('join');
        break;
      case 'settings':
        onOpenSettings();
        break;
      case 'replay':
        onOpenReplay();
        break;
      case 'logout':
        client.logout();
        break;
    }
  };

  useInput(
    (_input, key) => {
      if (key.escape && view === 'join') setView('menu');
    },
    { isActive: view === 'join' },
  );

  // The config form owns the full screen and its own key handling.
  if (view === 'config') {
    return (
      <RoomConfigScreen
        onCancel={() => setView('menu')}
        onCreate={(choices) => {
          setView('menu');
          guard(() => client.createRoom(buildRoomConfig(choices)));
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Panel title={s.lobby.heading} borderColor="green">
        <Box marginBottom={1}>
          <Text dimColor>
            {t('lobby.welcome', {
              nickname: client.self?.nickname ?? '',
              id: client.self?.id ?? '',
            })}
          </Text>
        </Box>
        {view === 'menu' ? (
          <Menu items={items} numbered onSelect={onSelect} isActive={!busy} />
        ) : (
          <TextPrompt
            label={s.lobby.roomIdPrompt}
            onSubmit={(value) => {
              const id = Number(value.trim());
              if (!Number.isInteger(id) || id < 1000 || id > 9999) {
                setError(t('lobby.joinRoomLabel'));
                return;
              }
              setView('menu');
              guard(() => client.joinRoom(id));
            }}
          />
        )}
        {busy ? <Text color="yellow">{s.connect.connecting}</Text> : null}
        <Banner text={error} tone="error" />
      </Panel>
      <KeyHints
        hints={[
          { keys: '↑↓/1-5', label: s.keys.move },
          { keys: 'Enter', label: s.keys.select },
          { keys: 'Esc', label: s.keys.back },
        ]}
      />
    </Box>
  );
}
