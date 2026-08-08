import type { LlmPromptTemplate, LlmProvider } from '../proto';

export const STORAGE_KEY_LLM_CONFIG = 'rabiriichi.llm.config.v1';

export interface PerProviderConfig {
  apiToken?: string;
  model?: string;
  baseUrl?: string;
  displayName?: string;
  language?: string;
  promptTemplate?: LlmPromptTemplate;
}

export interface StoredLlmConfig {
  lastProvider?: LlmProvider | undefined;
  byProvider: Partial<Record<LlmProvider, PerProviderConfig>>;
}

export function loadLlmConfig(): StoredLlmConfig {
  if (typeof localStorage === 'undefined') {
    return { byProvider: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LLM_CONFIG);
    if (!raw) {
      return { byProvider: {} };
    }
    const parsed = JSON.parse(raw) as StoredLlmConfig;
    return {
      lastProvider: parsed.lastProvider,
      byProvider: parsed.byProvider,
    };
  } catch {
    return { byProvider: {} };
  }
}

export function saveLlmConfig(
  provider: LlmProvider,
  config: PerProviderConfig,
): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    const current = loadLlmConfig();
    current.lastProvider = provider;
    current.byProvider[provider] = {
      ...current.byProvider[provider],
      ...config,
    };
    localStorage.setItem(STORAGE_KEY_LLM_CONFIG, JSON.stringify(current));
  } catch {
    // Ignore localStorage errors (e.g. quota, private browsing)
  }
}

export function clearLlmTokens(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    const current = loadLlmConfig();
    const nextByProvider: Record<number, PerProviderConfig> = {};
    const entries = Object.entries(current.byProvider);
    for (const [key, conf] of entries) {
      const { apiToken: _, ...rest } = conf;
      nextByProvider[Number(key)] = rest;
    }
    current.byProvider = nextByProvider;
    localStorage.setItem(STORAGE_KEY_LLM_CONFIG, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}
