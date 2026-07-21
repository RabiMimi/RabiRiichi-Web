/**
 * Connection flow: choose a mode (log in / register / quick guest), enter the
 * server address, then credentials. Delegates the actual work to the shared
 * client (`connect`, `loginUser`, `registerUser`), which persists the token and
 * server URL through the injected file store on success.
 */
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Panel, KeyHints, Banner } from '../ui/chrome';
import { Menu, type MenuItem } from '../ui/Menu';
import { TextPrompt } from '../ui/TextPrompt';
import { useApp } from '../ui/AppContext';
import { t, tc, tFunction } from '../i18n';
import { formatError } from '../../lib';

type Mode = 'login' | 'register';
type Step = 'mode' | 'server' | 'username' | 'password' | 'busy';

export function ConnectScreen({ onBack }: { onBack: () => void }) {
  const { client } = useApp();
  const s = tc();
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<Mode>('login');
  const [server, setServer] = useState(
    client.loadStoredCredentials()?.url ?? 'ws://localhost:5150',
  );
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const modeItems: MenuItem[] = [
    { key: 'login', label: s.connect.login },
    { key: 'register', label: s.connect.register },
  ];

  const run = (fn: () => Promise<void>) => {
    setStep('busy');
    setError('');
    fn().catch((e: unknown) => {
      setError(formatError(e, tFunction));
      setStep('mode');
    });
  };

  const finishAuth = (password: string) => {
    run(async () => {
      client.wsurl = server;
      if (mode === 'register') {
        await client.registerUser(username, username, password);
      } else {
        await client.loginUser(username, password);
      }
    });
  };

  return (
    <Box flexDirection="column">
      <Panel title={s.menu.connect} borderColor="green">
        {step === 'mode' ? (
          <Box flexDirection="column">
            <Text>{s.connect.mode}</Text>
            <Box marginTop={1}>
              <Menu
                items={modeItems}
                numbered
                onSelect={(item) => {
                  setMode(item.key as Mode);
                  setStep('server');
                }}
              />
            </Box>
          </Box>
        ) : null}

        {step === 'server' ? (
          <TextPrompt
            label={s.connect.server}
            initialValue={server}
            onSubmit={(value) => {
              const url = value.trim() || 'ws://localhost:5150';
              setServer(url);
              setStep('username');
            }}
          />
        ) : null}

        {step === 'username' ? (
          <TextPrompt
            label={t('connect.username')}
            initialValue={username}
            onSubmit={(value) => {
              if (!value.trim()) return;
              setUsername(value.trim());
              setStep('password');
            }}
          />
        ) : null}

        {step === 'password' ? (
          <TextPrompt
            label={t('connect.password')}
            password
            onSubmit={finishAuth}
          />
        ) : null}

        {step === 'busy' ? (
          <Text color="yellow">{s.connect.connecting}</Text>
        ) : null}

        <Banner text={error} tone="error" />
      </Panel>
      <KeyHints
        hints={[
          { keys: '↑↓/1-2', label: s.keys.move },
          { keys: 'Enter', label: s.keys.select },
          { keys: 'Esc', label: s.keys.back },
        ]}
      />
      <EscBack onBack={onBack} active={step === 'mode'} />
    </Box>
  );
}

/** Small helper: Esc returns to the previous screen when on the first step. */
function EscBack({ onBack, active }: { onBack: () => void; active: boolean }) {
  useInput(
    (_input, key) => {
      if (key.escape) onBack();
    },
    { isActive: active },
  );
  return null;
}
