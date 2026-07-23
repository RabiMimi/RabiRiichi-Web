/**
 * Waiting room: lists seats/players, lets the local player ready-up, add or
 * kick AIs, and leave. Shown when in a room but no game is in progress.
 */
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Panel, KeyHints, Banner } from '../ui/chrome';
import { Menu, type MenuItem } from '../ui/Menu';
import { useApp } from '../ui/AppContext';
import { t, tc, tFunction } from '../i18n';
import { formatError } from '../../lib';
import { UserStatus, AiType } from '../../proto';
import { getPlayerDisplayName } from '../../domain/model';
import { playerStatusLabel } from '../render/tableView';
import { optionalColors } from '../ui/inkProps';

export function RoomScreen() {
  const { client } = useApp();
  const s = tc();
  const room = client.room;
  const self = client.self;
  const [error, setError] = useState('');
  const [addingAi, setAddingAi] = useState(false);

  const guard = (fn: () => Promise<void>) => {
    setError('');
    fn().catch((e: unknown) => setError(formatError(e, tFunction)));
  };

  const isReady = self?.status === UserStatus.USER_STATUS_READY;
  const playerCount = room?.config?.playerCount ?? 2;
  const seats = Array.from({ length: playerCount }, (_, seat) =>
    room?.players.find((p) => p.seat === seat),
  );
  const canAddAi = room ? room.players.length < playerCount : false;

  const items: MenuItem[] = [
    {
      key: 'ready',
      label: isReady ? t('room.unready') : t('room.ready'),
    },
    {
      key: 'addai',
      label: t('room.addAi'),
      disabled: !canAddAi,
    },
    { key: 'leave', label: t('room.leave') },
  ];

  const aiItems: MenuItem[] = [
    { key: 'dummy', label: 'Dummy' },
    { key: 'rule', label: 'Rule-based' },
  ];

  const onSelect = (item: MenuItem) => {
    switch (item.key) {
      case 'ready':
        guard(() =>
          client.updateRoom(
            isReady
              ? UserStatus.USER_STATUS_IN_ROOM
              : UserStatus.USER_STATUS_READY,
          ),
        );
        break;
      case 'addai':
        setAddingAi(true);
        break;
      case 'leave':
        client.returnToRoom();
        client.close();
        break;
    }
  };

  useInput(
    (_input, key) => {
      if (key.escape && addingAi) setAddingAi(false);
    },
    { isActive: addingAi },
  );

  return (
    <Box flexDirection="column">
      <Panel
        title={t('room.title', { id: room?.id ?? '----' })}
        borderColor="blue"
      >
        <Box flexDirection="column" marginBottom={1}>
          {seats.map((p, seat) => (
            <Box key={seat}>
              <Text dimColor>{t('room.seat', { seat: seat + 1 })} </Text>
              {p ? (
                <>
                  <Text
                    bold
                    {...optionalColors(p.id === self?.id ? 'cyan' : undefined)}
                  >
                    {getPlayerDisplayName(p, t)}
                  </Text>
                  {p.aiType !== AiType.AI_TYPE_NONE ? (
                    <Text color="magenta"> [AI]</Text>
                  ) : null}
                  <Text
                    color={
                      p.status === UserStatus.USER_STATUS_READY
                        ? 'green'
                        : 'yellow'
                    }
                  >
                    {'  '}
                    {playerStatusLabel(p.status, t)}
                  </Text>
                </>
              ) : (
                <Text dimColor>{t('room.emptySeat')}</Text>
              )}
            </Box>
          ))}
        </Box>

        {addingAi ? (
          <Box flexDirection="column">
            <Text>{s.lobby.addAiType}</Text>
            <Menu
              items={aiItems}
              numbered
              onSelect={(item) => {
                setAddingAi(false);
                guard(() =>
                  client.addAi(
                    item.key === 'rule'
                      ? AiType.AI_TYPE_RULE_BASED
                      : AiType.AI_TYPE_DUMMY,
                  ),
                );
              }}
            />
          </Box>
        ) : (
          <Menu items={items} numbered onSelect={onSelect} />
        )}
        <Banner text={error} tone="error" />
      </Panel>
      <KeyHints
        hints={[
          { keys: '↑↓', label: s.keys.move },
          { keys: 'Enter', label: s.keys.select },
          { keys: 'Esc', label: s.keys.back },
        ]}
      />
    </Box>
  );
}
