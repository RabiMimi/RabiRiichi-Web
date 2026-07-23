import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { resolveConfigPath } from './configPath';

describe('resolveConfigPath', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.RABIRIICHI_CLI_CONFIG;
    delete process.env.XDG_CONFIG_HOME;
  });

  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  it('prefers an explicit path over everything else', () => {
    process.env.RABIRIICHI_CLI_CONFIG = '/from/env.json';
    expect(resolveConfigPath('/explicit.json')).toBe('/explicit.json');
  });

  it('uses RABIRIICHI_CLI_CONFIG when set', () => {
    process.env.RABIRIICHI_CLI_CONFIG = '/from/env.json';
    expect(resolveConfigPath()).toBe('/from/env.json');
  });

  it('uses XDG_CONFIG_HOME when set', () => {
    process.env.XDG_CONFIG_HOME = '/xdg';
    expect(resolveConfigPath()).toBe(
      join('/xdg', 'rabiriichi-cli', 'config.json'),
    );
  });

  it('falls back to ~/.config when no env vars are set', () => {
    expect(resolveConfigPath()).toMatch(
      /[/\\]\.config[/\\]rabiriichi-cli[/\\]config\.json$/,
    );
  });
});
