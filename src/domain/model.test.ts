import { describe, it, expect } from 'vitest';
import {
  nextPlayerSeat,
  prevPlayerSeat,
  getPlayerBySeat,
  getPlayerById,
  getPlayerDisplayName,
  getAiTypeName,
  getWindKey,
  isTsumoTile,
  shouldRevealHand,
  waitMeetsMinHan,
  displayHan,
  applyRiichiBonusToWaits,
  riichiBonusHan,
  yakumanOutlook,
  totalYakuman,
  deadWallRinshanCount,
  NUM_RINSHAN,
  type PlayerModel,
  type PlayerAgariState,
  type MappedTenpaiInfo,
} from './model';
import { UserStatus, AiType, DoraOption } from '../proto';

describe('Model seat math', () => {
  describe('2-player config', () => {
    const playerCount = 2;

    it('should calculate next seat correctly', () => {
      expect(nextPlayerSeat(0, playerCount)).toBe(1);
      expect(nextPlayerSeat(1, playerCount)).toBe(0);
    });

    it('should calculate prev seat correctly', () => {
      expect(prevPlayerSeat(0, playerCount)).toBe(1);
      expect(prevPlayerSeat(1, playerCount)).toBe(0);
    });
  });

  describe('4-player config', () => {
    const playerCount = 4;

    it('should calculate next seat correctly', () => {
      expect(nextPlayerSeat(0, playerCount)).toBe(1);
      expect(nextPlayerSeat(1, playerCount)).toBe(2);
      expect(nextPlayerSeat(2, playerCount)).toBe(3);
      expect(nextPlayerSeat(3, playerCount)).toBe(0);
    });

    it('should calculate prev seat correctly', () => {
      expect(prevPlayerSeat(0, playerCount)).toBe(3);
      expect(prevPlayerSeat(1, playerCount)).toBe(0);
      expect(prevPlayerSeat(2, playerCount)).toBe(1);
      expect(prevPlayerSeat(3, playerCount)).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero player count gracefully', () => {
      expect(nextPlayerSeat(0, 0)).toBe(0);
      expect(prevPlayerSeat(0, 0)).toBe(0);
    });
  });
});

describe('Model lookups', () => {
  const mockPlayers: PlayerModel[] = [
    {
      id: 101,
      nickname: 'Alice',
      status: UserStatus.USER_STATUS_PLAYING,
      seat: 0,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    },
    {
      id: 102,
      nickname: 'Bob',
      status: UserStatus.USER_STATUS_PLAYING,
      seat: 1,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    },
  ];

  it('should find player by seat', () => {
    expect(getPlayerBySeat(mockPlayers, 0)).toBe(mockPlayers[0]);
    expect(getPlayerBySeat(mockPlayers, 1)).toBe(mockPlayers[1]);
    expect(getPlayerBySeat(mockPlayers, 2)).toBeUndefined();
  });

  it('should find player by id', () => {
    expect(getPlayerById(mockPlayers, 101)).toBe(mockPlayers[0]);
    expect(getPlayerById(mockPlayers, 102)).toBe(mockPlayers[1]);
    expect(getPlayerById(mockPlayers, 999)).toBeUndefined();
  });
});

describe('Model wind conversion', () => {
  it('should return correct wind keys', () => {
    expect(getWindKey(0)).toBe('east');
    expect(getWindKey(1)).toBe('south');
    expect(getWindKey(2)).toBe('west');
    expect(getWindKey(3)).toBe('north');
    expect(getWindKey(4)).toBe('east');
    expect(getWindKey(7)).toBe('north');
  });
});

describe('isTsumoTile', () => {
  it('treats a tile without discardInfo as tsumo', () => {
    expect(isTsumoTile({ traceId: 1, tile: 17 })).toBe(true);
  });

  it('treats a tile with discardInfo as ron (not tsumo)', () => {
    expect(
      isTsumoTile({
        traceId: 1,
        tile: 17,
        discardInfo: { from: 2, reason: 1, time: 5 },
      }),
    ).toBe(false);
  });

  it('treats a discardInfo with from=0 as ron (from is never null on the wire)', () => {
    expect(
      isTsumoTile({
        traceId: 1,
        tile: 17,
        discardInfo: { from: 0, reason: 1, time: 5 },
      }),
    ).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isTsumoTile(null)).toBe(false);
    expect(isTsumoTile(undefined)).toBe(false);
  });
});

describe('shouldRevealHand', () => {
  const winner: PlayerAgariState = { gainPoints: 8000, losePoints: 0 };
  const tenpai: PlayerAgariState = {
    gainPoints: 1000,
    losePoints: 0,
    isTenpai: true,
  };
  const scoredOnly: PlayerAgariState = {
    gainPoints: 0,
    losePoints: 0,
    scores: { items: [] },
  };
  // A noten player at a draw: reducer still assigns an (empty) agari state.
  const noten: PlayerAgariState = { gainPoints: 0, losePoints: 3000 };

  it('reveals a winner', () => {
    expect(shouldRevealHand(winner, false)).toBe(true);
  });

  it('reveals a tenpai player at a draw', () => {
    expect(shouldRevealHand(tenpai, false)).toBe(true);
  });

  it('reveals a player with a score breakdown', () => {
    expect(shouldRevealHand(scoredOnly, false)).toBe(true);
  });

  it('does NOT reveal a noten player at a draw (even though agari is set)', () => {
    expect(shouldRevealHand(noten, false)).toBe(false);
  });

  it('never reveals the local player', () => {
    expect(shouldRevealHand(winner, true)).toBe(false);
  });

  it('does not reveal when there is no agari', () => {
    expect(shouldRevealHand(null, false)).toBe(false);
    expect(shouldRevealHand(undefined, false)).toBe(false);
  });
});

describe('waitMeetsMinHan', () => {
  const wait = (over: Partial<MappedTenpaiInfo>): MappedTenpaiInfo => ({
    winningTile: 17,
    remainingCount: 4,
    han: 0,
    yakuHan: 0,
    fu: 30,
    yakuman: 0,
    bonusYakuman: 0,
    points: 0,
    maxHan: 0,
    ...over,
  });

  it('is unwinnable when yaku han is below minHan (dora does not count)', () => {
    // 3 total han but all from dora (yakuHan 0) -> fails a 1-han requirement.
    expect(waitMeetsMinHan(wait({ han: 3, yakuHan: 0 }), 1)).toBe(false);
  });

  it('is winnable when yaku han meets minHan', () => {
    expect(waitMeetsMinHan(wait({ han: 1, yakuHan: 1 }), 1)).toBe(true);
  });

  it('always winnable with a yakuman regardless of yaku han', () => {
    expect(waitMeetsMinHan(wait({ yakuman: 1, yakuHan: 0 }), 2)).toBe(true);
  });

  it('counts the riichi bonus yaku toward the requirement', () => {
    const w = wait({ yakuHan: 0 });
    expect(waitMeetsMinHan(w, 1, 0)).toBe(false);
    expect(waitMeetsMinHan(w, 1, 1)).toBe(true);
  });

  it('riichi alone is not enough when minHan exceeds 1', () => {
    // Only riichi (+1) against a 2-han requirement -> still 番缚.
    expect(waitMeetsMinHan(wait({ yakuHan: 0 }), 2, 1)).toBe(false);
    expect(waitMeetsMinHan(wait({ yakuHan: 1 }), 2, 1)).toBe(true);
  });
});

describe('displayHan', () => {
  const wait = (over: Partial<MappedTenpaiInfo>): MappedTenpaiInfo => ({
    winningTile: 17,
    remainingCount: 4,
    han: 0,
    yakuHan: 0,
    fu: 30,
    yakuman: 0,
    bonusYakuman: 0,
    points: 0,
    maxHan: 0,
    ...over,
  });

  it('returns the raw han when there is no bonus', () => {
    expect(displayHan(wait({ han: 2 }))).toBe(2);
  });

  it('folds the riichi bonus into the displayed han', () => {
    // Riichi-select preview: server-reported han omits the +1 for riichi.
    expect(displayHan(wait({ han: 2 }), 1)).toBe(3);
  });

  it('ignores the bonus for yakuman waits', () => {
    expect(displayHan(wait({ yakuman: 1, han: 0 }), 1)).toBe(0);
  });
});

describe('applyRiichiBonusToWaits', () => {
  const wait = (over: Partial<MappedTenpaiInfo>): MappedTenpaiInfo => ({
    winningTile: 17,
    remainingCount: 4,
    han: 0,
    yakuHan: 0,
    fu: 30,
    yakuman: 0,
    bonusYakuman: 0,
    points: 0,
    maxHan: 0,
    ...over,
  });

  it('adds +1 to han and yakuHan for each non-yakuman wait', () => {
    const result = applyRiichiBonusToWaits([
      wait({ han: 0, yakuHan: 0 }),
      wait({ han: 2, yakuHan: 1 }),
    ]);
    expect(result[0]).toMatchObject({ han: 1, yakuHan: 1 });
    expect(result[1]).toMatchObject({ han: 3, yakuHan: 2 });
  });

  it('leaves yakuman waits unchanged', () => {
    const [result] = applyRiichiBonusToWaits([
      wait({ yakuman: 1, yakuHan: 0 }),
    ]);
    expect(result).toMatchObject({ yakuman: 1, han: 0, yakuHan: 0 });
  });

  it('does not mutate the input', () => {
    const input = wait({ han: 1, yakuHan: 1 });
    applyRiichiBonusToWaits([input]);
    expect(input).toMatchObject({ han: 1, yakuHan: 1 });
  });
});

describe('deadWallRinshanCount', () => {
  const NORTH = 68; // suit Z(4) << 4 | 4
  const NUKI = DoraOption.DORA_OPTION_NUKI_DORA;

  it('returns base count for null config', () => {
    expect(deadWallRinshanCount(null)).toBe(NUM_RINSHAN);
  });

  it('returns base count when nukidora is disabled', () => {
    expect(
      deadWallRinshanCount({ doraOption: 0, initialTiles: [NORTH, NORTH] }),
    ).toBe(NUM_RINSHAN);
  });

  it('adds one rinshan per North when nukidora is enabled', () => {
    expect(
      deadWallRinshanCount({
        doraOption: NUKI,
        initialTiles: [NORTH, NORTH, NORTH, NORTH, 17, 18],
      }),
    ).toBe(NUM_RINSHAN + 4);
  });
});

describe('getPlayerDisplayName', () => {
  const mockTranslate = (key: string) => {
    const translations: Record<string, string> = {
      'ai.type.1': 'Drooling Rabbit',
      'ai.type.2': 'Nodocchi',
      'ai.llm.gemini': 'Gemi狸',
      'ai.llm.openai': 'AI',
      'ai.llm.generic': 'LLM',
    };
    return translations[key] ?? key;
  };

  it('localizes LLM sentinel nicknames', () => {
    const geminiPlayer: PlayerModel = {
      id: 1,
      nickname: '@llm:gemini',
      status: UserStatus.USER_STATUS_PLAYING,
      seat: 0,
      gameState: null,
      aiType: AiType.AI_TYPE_LLM,
    };
    expect(getPlayerDisplayName(geminiPlayer, mockTranslate)).toBe('Gemi狸');

    const openaiPlayer: PlayerModel = {
      ...geminiPlayer,
      nickname: '@llm:openai',
    };
    expect(getPlayerDisplayName(openaiPlayer, mockTranslate)).toBe('AI');

    const unknownPlayer: PlayerModel = {
      ...geminiPlayer,
      nickname: '@llm:unknown_provider',
    };
    expect(getPlayerDisplayName(unknownPlayer, mockTranslate)).toBe('LLM');
  });

  it('resolves from a minimal identity (nickname + aiType)', () => {
    // The chat layer resolves the processed name from just these two fields.
    expect(
      getPlayerDisplayName(
        { nickname: '@llm:gemini', aiType: AiType.AI_TYPE_LLM },
        mockTranslate,
      ),
    ).toBe('Gemi狸');
  });

  it('returns custom display name verbatim for LLM AI', () => {
    const customPlayer: PlayerModel = {
      id: 1,
      nickname: 'Custom Gemini Bot',
      status: UserStatus.USER_STATUS_PLAYING,
      seat: 0,
      gameState: null,
      aiType: AiType.AI_TYPE_LLM,
    };
    expect(getPlayerDisplayName(customPlayer, mockTranslate)).toBe(
      'Custom Gemini Bot',
    );
  });

  it('localizes built-in AI enum types when nickname matches enum name', () => {
    const dummyPlayer: PlayerModel = {
      id: 1,
      nickname: 'DUMMY',
      status: UserStatus.USER_STATUS_PLAYING,
      seat: 0,
      gameState: null,
      aiType: AiType.AI_TYPE_DUMMY,
    };
    expect(getPlayerDisplayName(dummyPlayer, mockTranslate)).toBe(
      'Drooling Rabbit',
    );
  });
});

describe('getAiTypeName', () => {
  const mockTranslate = (key: string) => {
    const translations: Record<string, string> = {
      'ai.type.1': 'Drooling Rabbit',
      'ai.type.2': 'Nodocchi',
      'ai.type.3': 'LLM',
    };
    return translations[key] ?? key;
  };

  it('keys AI type labels by the numeric enum value', () => {
    expect(getAiTypeName(AiType.AI_TYPE_DUMMY, mockTranslate)).toBe(
      'Drooling Rabbit',
    );
    expect(getAiTypeName(AiType.AI_TYPE_RULE_BASED, mockTranslate)).toBe(
      'Nodocchi',
    );
    expect(getAiTypeName(AiType.AI_TYPE_LLM, mockTranslate)).toBe('LLM');
  });
});

describe('bonus yakuman waits', () => {
  const wait = (over: Partial<MappedTenpaiInfo>): MappedTenpaiInfo => ({
    winningTile: 17,
    remainingCount: 4,
    han: 0,
    yakuHan: 0,
    fu: 30,
    yakuman: 0,
    bonusYakuman: 0,
    points: 0,
    maxHan: 0,
    ...over,
  });

  it('does not let a bonus yakuman satisfy 番缚', () => {
    expect(waitMeetsMinHan(wait({ bonusYakuman: 1 }), 1)).toBe(false);
    expect(waitMeetsMinHan(wait({ bonusYakuman: 1, yakuHan: 1 }), 1)).toBe(
      true,
    );
    expect(waitMeetsMinHan(wait({ yakuman: 1 }), 1)).toBe(true);
  });

  it('still adds the riichi han to a bonus yakuman wait', () => {
    // A real yakuman ignores the bonus; 八連荘 does not, because the hand
    // still needs the riichi han to clear 番缚.
    const [bonus] = applyRiichiBonusToWaits([wait({ bonusYakuman: 1 })], 1);
    expect(bonus?.yakuHan).toBe(1);
    expect(waitMeetsMinHan(bonus!, 1)).toBe(true);

    const [real] = applyRiichiBonusToWaits([wait({ yakuman: 1 })], 1);
    expect(real?.yakuHan).toBe(0);
  });

  it('counts a bonus yakuman for display', () => {
    expect(totalYakuman(wait({ bonusYakuman: 1 }))).toBe(1);
    expect(totalYakuman(wait({ yakuman: 1, bonusYakuman: 1 }))).toBe(2);
    expect(totalYakuman(wait({}))).toBe(0);
    expect(displayHan(wait({ bonusYakuman: 1, han: 3 }), 1)).toBe(3);
  });

  it('announces a winnable bonus yakuman but ignores an unwinnable one', () => {
    const winnable = wait({ bonusYakuman: 1, yakuHan: 1, han: 1, maxHan: 1 });
    expect(yakumanOutlook([winnable], { minHan: 1 })).toBe('confirmed');

    const unwinnable = wait({ bonusYakuman: 1 });
    expect(yakumanOutlook([unwinnable], { minHan: 1 })).toBe(null);
  });
});

describe('yakumanOutlook', () => {
  const wait = (over: Partial<MappedTenpaiInfo>): MappedTenpaiInfo => ({
    winningTile: 17,
    remainingCount: 4,
    han: 1,
    yakuHan: 1,
    fu: 30,
    yakuman: 0,
    bonusYakuman: 0,
    points: 0,
    maxHan: 1,
    ...over,
  });

  /** Shanpon on suuankou: sanankou on ron, yakuman on tsumo. */
  const suuankouShanpon = wait({ han: 4, yakuHan: 4, maxHan: 13 });
  const guaranteedYakuman = wait({ yakuman: 1, maxHan: 13 });

  it('reports nothing for an ordinary hand', () => {
    expect(yakumanOutlook([wait({})], { minHan: 1 })).toBeNull();
  });

  it('reports a chance when only the tsumo path is a yakuman', () => {
    expect(yakumanOutlook([suuankouShanpon], { minHan: 1 })).toBe('chance');
  });

  it('reports confirmed when the wait guarantees a yakuman', () => {
    expect(yakumanOutlook([guaranteedYakuman], { minHan: 1 })).toBe(
      'confirmed',
    );
  });

  it('treats a double yakuman as confirmed', () => {
    const doubled = wait({ yakuman: 2, maxHan: 26 });
    expect(yakumanOutlook([doubled], { minHan: 1 })).toBe('confirmed');
  });

  it('is only confirmed when every wait guarantees it', () => {
    // One cheap wait means the player can still finish without a yakuman.
    expect(yakumanOutlook([guaranteedYakuman, wait({})], { minHan: 1 })).toBe(
      'chance',
    );
  });

  it('ignores waits that cannot be won under the minimum-han rule', () => {
    // Dora-only wait: 5 han but no yaku, so it fails 番缚 and must not be
    // mistaken for a cheap wait that downgrades the confirmed yakuman.
    const doraOnly = wait({ han: 5, yakuHan: 0, maxHan: 5 });
    expect(yakumanOutlook([guaranteedYakuman, doraOnly], { minHan: 1 })).toBe(
      'confirmed',
    );
  });

  it('reports nothing when no wait is winnable at all', () => {
    const noYaku = wait({ han: 0, yakuHan: 0, maxHan: 0 });
    expect(yakumanOutlook([noYaku], { minHan: 1 })).toBeNull();
    expect(yakumanOutlook([], { minHan: 1 })).toBeNull();
  });

  describe('counted yakuman (累计役满)', () => {
    const twelveHan = wait({ han: 12, yakuHan: 12, maxHan: 12 });

    it('confirms when riichi pushes the hand to 13 han', () => {
      expect(yakumanOutlook([twelveHan], { minHan: 1, bonusYaku: 1 })).toBe(
        'confirmed',
      );
    });

    it('stays silent for the same hand on an ordinary discard', () => {
      expect(yakumanOutlook([twelveHan], { minHan: 1 })).toBeNull();
    });

    it('confirms a hand already at 13 han without any bonus', () => {
      const thirteenHan = wait({ han: 13, yakuHan: 13, maxHan: 13 });
      expect(yakumanOutlook([thirteenHan], { minHan: 1 })).toBe('confirmed');
    });

    it('ignores the count when the rule is disabled', () => {
      expect(
        yakumanOutlook([twelveHan], {
          minHan: 1,
          bonusYaku: 1,
          kazoeEnabled: false,
        }),
      ).toBeNull();
    });

    it('does not count a hand that stays short of 13', () => {
      // 11 han + riichi is 12: not a yakuman by any route.
      const elevenHan = wait({ han: 11, yakuHan: 11, maxHan: 11 });
      expect(
        yakumanOutlook([elevenHan], { minHan: 1, bonusYaku: 1 }),
      ).toBeNull();
      // ...but if tsumo would add the 13th han, it is reachable.
      const withTsumo = wait({ han: 11, yakuHan: 11, maxHan: 12 });
      expect(yakumanOutlook([withTsumo], { minHan: 1, bonusYaku: 1 })).toBe(
        'chance',
      );
    });
  });

  it('lets a riichi bonus make an otherwise unwinnable wait count', () => {
    // Yakuless on ron, so it fails 番缚 and is ignored; riichi supplies the
    // missing yaku and the tsumo yakuman becomes reachable.
    const yakuless = wait({ han: 0, yakuHan: 0, maxHan: 13 });
    expect(yakumanOutlook([yakuless], { minHan: 1 })).toBeNull();
    expect(yakumanOutlook([yakuless], { minHan: 1, bonusYaku: 1 })).toBe(
      'chance',
    );
  });

  it('announces nothing under aotenjou', () => {
    // There a yakuman is merely 13 extra han, so maxHan >= 13 says nothing
    // about one and there is no limit to announce.
    expect(
      yakumanOutlook([guaranteedYakuman], { minHan: 1, yakumanEnabled: false }),
    ).toBeNull();
    expect(
      yakumanOutlook([suuankouShanpon], { minHan: 1, yakumanEnabled: false }),
    ).toBeNull();
  });
});

describe('riichiBonusHan', () => {
  const player = (jun: number, calledCount = 0): PlayerModel =>
    ({
      gameState: {
        jun,
        hand: { called: Array.from({ length: calledCount }, () => ({})) },
      },
    }) as unknown as PlayerModel;

  it('is 2 on the first jun, when riichi would be a double riichi', () => {
    expect(riichiBonusHan([player(1), player(1), player(0), player(1)])).toBe(
      2,
    );
  });

  it('drops to 1 once anyone is past their first turn', () => {
    expect(riichiBonusHan([player(1), player(2)])).toBe(1);
  });

  it('drops to 1 once a call has interrupted the first go-around', () => {
    expect(riichiBonusHan([player(1), player(1, 1)])).toBe(1);
  });

  it('ignores players with no game state yet', () => {
    expect(riichiBonusHan([player(1), {} as PlayerModel])).toBe(2);
  });
});
