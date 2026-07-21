import { describe, it, expect } from 'vitest';
import { createClientPlatform } from './index';

describe('createClientPlatform translate', () => {
  it('defaults to an identity translator', () => {
    const platform = createClientPlatform();
    expect(platform.translate('ai.type.3')).toBe('ai.type.3');
  });

  it('uses the injected translator when provided', () => {
    const platform = createClientPlatform({
      translate: (key) => (key === 'ai.type.3' ? 'LLM' : key),
    });
    expect(platform.translate('ai.type.3')).toBe('LLM');
  });
});
