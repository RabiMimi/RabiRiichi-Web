import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LlmProvider } from '../proto';
import { loadLlmConfig, saveLlmConfig, clearLlmTokens } from './llmStorage';

describe('llmStorage', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads empty config when localStorage is empty', () => {
    const config = loadLlmConfig();
    expect(config.lastProvider).toBeUndefined();
    expect(config.byProvider).toEqual({});
  });

  it('saves and loads config per provider', () => {
    saveLlmConfig(LlmProvider.LLM_PROVIDER_GEMINI, {
      apiToken: 'gemini-key',
      model: 'gemini-3.5-flash',
    });

    saveLlmConfig(LlmProvider.LLM_PROVIDER_OPENAI, {
      apiToken: 'openai-key',
      model: 'gpt-4o-mini',
    });

    const loaded = loadLlmConfig();
    expect(loaded.lastProvider).toBe(LlmProvider.LLM_PROVIDER_OPENAI);
    expect(loaded.byProvider[LlmProvider.LLM_PROVIDER_GEMINI]).toEqual({
      apiToken: 'gemini-key',
      model: 'gemini-3.5-flash',
    });
    expect(loaded.byProvider[LlmProvider.LLM_PROVIDER_OPENAI]).toEqual({
      apiToken: 'openai-key',
      model: 'gpt-4o-mini',
    });
  });

  it('clears tokens for all providers', () => {
    saveLlmConfig(LlmProvider.LLM_PROVIDER_GEMINI, {
      apiToken: 'gemini-key',
      model: 'gemini-3.5-flash',
    });
    saveLlmConfig(LlmProvider.LLM_PROVIDER_OPENAI, {
      apiToken: 'openai-key',
      model: 'gpt-4o-mini',
    });

    clearLlmTokens();

    const loaded = loadLlmConfig();
    expect(
      loaded.byProvider[LlmProvider.LLM_PROVIDER_GEMINI]?.apiToken,
    ).toBeUndefined();
    expect(loaded.byProvider[LlmProvider.LLM_PROVIDER_GEMINI]?.model).toBe(
      'gemini-3.5-flash',
    );
    expect(
      loaded.byProvider[LlmProvider.LLM_PROVIDER_OPENAI]?.apiToken,
    ).toBeUndefined();
    expect(loaded.byProvider[LlmProvider.LLM_PROVIDER_OPENAI]?.model).toBe(
      'gpt-4o-mini',
    );
  });
});
