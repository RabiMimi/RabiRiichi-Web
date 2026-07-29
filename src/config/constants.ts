export const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-3.5-flash';

/**
 * Default xAI model. A model whose reasoning can be turned down (or off) is the
 * right default for a live seat: the server asks for the least reasoning the
 * model allows, and one that always thinks hard risks exceeding the per-action
 * timeout on every turn.
 */
export const DEFAULT_GROK_MODEL = 'grok-4.3';
