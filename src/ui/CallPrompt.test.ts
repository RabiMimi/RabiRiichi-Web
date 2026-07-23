import { describe, expect, it } from 'vitest';
import { getScreenPosition } from '../scene/seat';
import { getCallPromptSeatClass } from './callPromptPosition';

describe('call prompt positioning', () => {
  it('places the next and previous players by their discard rivers', () => {
    const next = getScreenPosition(2, 1, 4);
    const previous = getScreenPosition(0, 1, 4);

    expect(getCallPromptSeatClass(next)).toContain('left-[62%]');
    expect(getCallPromptSeatClass(previous)).toContain('left-[38%]');
  });

  it('places the opponent opposite the local player in a two-player game', () => {
    const opponent = getScreenPosition(1, 0, 2);

    expect(getCallPromptSeatClass(opponent)).toContain('top-[22vh]');
    expect(getCallPromptSeatClass(opponent)).toContain('left-1/2');
  });
});
