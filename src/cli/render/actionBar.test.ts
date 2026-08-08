import { describe, it, expect, beforeAll } from 'vitest';
import type { ActionOption, MappedInquiry } from '../../domain/inquiry';
import {
  followUpFor,
  autoChoiceFor,
  hasDiscard,
  legalDiscardIds,
  actionLabel,
} from './actionBar';
import { initI18n, setLanguage, t } from '../i18n';

const skip: ActionOption = { type: 'skip', label: 'Skip', actionIndex: 0 };
const agari: ActionOption = {
  type: 'agari',
  label: 'Ron',
  actionIndex: 1,
  incomingTileId: 5,
  isTsumo: false,
};
const ponOne: ActionOption = {
  type: 'pon',
  label: 'Pon',
  actionIndex: 2,
  tileGroups: [{ index: 0, tiles: [] }],
};
const ponTwo: ActionOption = {
  type: 'pon',
  label: 'Pon',
  actionIndex: 2,
  tileGroups: [
    { index: 0, tiles: [] },
    { index: 1, tiles: [] },
  ],
};
const nuki: ActionOption = {
  type: 'nukidora',
  label: 'North',
  actionIndex: 3,
  choiceIndex: 0,
};
const riichi: ActionOption = {
  type: 'riichi',
  label: 'Riichi',
  actionIndex: 4,
  legalTiles: [10, 11],
};

describe('followUpFor', () => {
  it('needs no follow-up for skip/agari/nukidora', () => {
    expect(followUpFor(skip)).toEqual({ kind: 'none' });
    expect(followUpFor(agari)).toEqual({ kind: 'none' });
    expect(followUpFor(nuki)).toEqual({ kind: 'none' });
  });

  it('auto-resolves a single call group but asks for multiple', () => {
    expect(followUpFor(ponOne)).toEqual({ kind: 'none' });
    expect(followUpFor(ponTwo)).toEqual({ kind: 'group' });
  });

  it('requires a discard tile for riichi', () => {
    expect(followUpFor(riichi)).toEqual({ kind: 'discard', riichi: true });
  });
});

describe('autoChoiceFor', () => {
  it('uses the single group index for a one-group call', () => {
    expect(autoChoiceFor(ponOne)).toBe(0);
  });
  it('returns undefined for multi-group calls (needs a choice)', () => {
    expect(autoChoiceFor(ponTwo)).toBeUndefined();
  });
  it('uses choiceIndex for nukidora', () => {
    expect(autoChoiceFor(nuki)).toBe(0);
  });
  it('returns undefined for confirm/skip actions', () => {
    expect(autoChoiceFor(skip)).toBeUndefined();
    expect(autoChoiceFor(agari)).toBeUndefined();
  });
});

describe('hasDiscard / legalDiscardIds', () => {
  const mapped: MappedInquiry = {
    buttons: [skip, riichi],
    playTile: { actionIndex: 5, legalTiles: [20, 21, 22] },
  };

  it('detects a normal discard', () => {
    expect(hasDiscard(mapped)).toBe(true);
    expect(hasDiscard({ buttons: [skip] })).toBe(false);
  });

  it('returns normal legal discards', () => {
    expect(legalDiscardIds(mapped, false)).toEqual([20, 21, 22]);
  });

  it('returns riichi legal discards from the riichi button', () => {
    expect(legalDiscardIds(mapped, true)).toEqual([10, 11]);
  });

  it('returns empty riichi discards when no riichi button exists', () => {
    expect(legalDiscardIds({ buttons: [skip] }, true)).toEqual([]);
  });
});

describe('actionLabel', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('localizes button labels to English (not the Chinese fallback)', () => {
    expect(actionLabel(skip, t)).toBe('Skip');
    expect(actionLabel(ponOne, t)).toBe('Pon');
    expect(actionLabel(riichi, t)).toBe('Riichi');
  });

  it('distinguishes tsumo from ron by the fallback label', () => {
    const ron: ActionOption = { ...agari, label: '和' };
    const tsumo: ActionOption = { ...agari, label: '自摸' };
    expect(actionLabel(ron, t)).toBe('Ron');
    expect(actionLabel(tsumo, t)).toBe('Tsumo');
  });

  it('localizes the next-round confirm action', () => {
    const nextRound: ActionOption = {
      type: 'next-round',
      label: '确定',
      actionIndex: 0,
    };
    expect(actionLabel(nextRound, t)).toBe('Confirm');
  });

  it('localizes to the selected language', async () => {
    await setLanguage('zhs');
    expect(actionLabel(ponOne, t)).toBe('碰');
    await setLanguage('en');
  });
});
