export const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-3.5-flash';
