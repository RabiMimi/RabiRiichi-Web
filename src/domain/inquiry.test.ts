import { describe, it, expect } from 'vitest';
import { AgariType } from '../proto/index.js';
import type { ISinglePlayerInquiryMsg } from '../proto/index.js';
import {
  mapInquiry,
  encodeInquiryResponse,
  getAutoResponse,
  findActiveDiscardCandidate,
  getClaimTargetTileId,
  type MappedInquiry,
  type DiscardCandidate,
} from './inquiry.js';
import { assert } from '../lib/assert.js';

describe('Inquiry Mapping & Response Encoding', () => {
  const mockInquiry: ISinglePlayerInquiryMsg = {
    actions: [
      {
        skipAction: {},
      },
      {
        playTileAction: {
          tiles: [
            { traceId: 100, tile: 17 }, // 1m
            { traceId: 101, tile: 18 }, // 2m
            { traceId: 102, tile: 19 }, // 3m
          ],
        },
      },
      {
        chiiAction: {
          tileGroups: [
            {
              tiles: [
                { traceId: 100, tile: 17 },
                { traceId: 101, tile: 18 },
                { traceId: 200, tile: 19 }, // from discard
              ],
            },
          ],
        },
      },
      {
        riichiAction: {
          tiles: [{ traceId: 102, tile: 19 }],
        },
      },
      {
        agariAction: {
          type: AgariType.AGARI_TYPE_RON,
          incoming: { traceId: 200, tile: 19 },
        },
      },
    ],
  };

  it('should map inquiry actions correctly to options', () => {
    const mapped = mapInquiry(mockInquiry);

    // Buttons should have skip, chii, riichi, agari (Ron)
    expect(mapped.buttons).toHaveLength(4);

    expect(mapped.buttons[0]).toEqual({
      type: 'skip',
      label: '跳过',
      actionIndex: 0,
    });

    expect(mapped.buttons[1]).toEqual({
      type: 'chii',
      label: '吃',
      actionIndex: 2,
      tileGroups: [
        {
          index: 0,
          tiles: [
            { traceId: 100, tile: 17, isCalled: false },
            { traceId: 101, tile: 18, isCalled: false },
            { traceId: 200, tile: 19, isCalled: false },
          ],
        },
      ],
    });

    expect(mapped.buttons[2]).toEqual({
      type: 'riichi',
      label: '立直',
      actionIndex: 3,
      legalTiles: [102],
      candidates: [],
    });

    expect(mapped.buttons[3]).toEqual({
      type: 'agari',
      label: '和',
      actionIndex: 4,
      incomingTileId: 200,
    });

    // playTile should be populated (not as a button)
    expect(mapped.playTile).toBeDefined();
    expect(mapped.playTile).toEqual({
      actionIndex: 1,
      legalTiles: [100, 101, 102],
      candidates: [],
    });
  });

  it('should encode skip response correctly', () => {
    const mapped = mapInquiry(mockInquiry);
    const skipButton = mapped.buttons[0];
    assert(skipButton, 'skipButton should be defined');
    const encoded = encodeInquiryResponse(mockInquiry, skipButton);

    expect(encoded).toEqual({
      index: 0,
      response: '{}',
    });
  });

  it('should encode play-tile response using traceId', () => {
    const mapped = mapInquiry(mockInquiry);
    const playTile = mapped.playTile;
    assert(playTile, 'playTile should be defined');
    const playTileOption = {
      type: 'play-tile' as const,
      label: '打',
      actionIndex: playTile.actionIndex,
      legalTiles: playTile.legalTiles,
    };

    // Selecting 2m (traceId 101) which is index 1 in playTileAction.tiles
    const encoded = encodeInquiryResponse(mockInquiry, playTileOption, 101);

    expect(encoded).toEqual({
      index: 1,
      response: '1',
    });
  });

  it('should encode riichi response using traceId', () => {
    const mapped = mapInquiry(mockInquiry);
    const riichiButton = mapped.buttons[2];
    assert(riichiButton, 'riichiButton should be defined');

    // Selecting traceId 102 which is index 0 in riichiAction.tiles
    const encoded = encodeInquiryResponse(mockInquiry, riichiButton, 102);

    expect(encoded).toEqual({
      index: 3,
      response: '0',
    });
  });

  it('should encode chii group index response', () => {
    const mapped = mapInquiry(mockInquiry);
    const chiiButton = mapped.buttons[1];
    assert(chiiButton, 'chiiButton should be defined');

    // Selecting group 0
    const encoded = encodeInquiryResponse(mockInquiry, chiiButton, 0);

    expect(encoded).toEqual({
      index: 2,
      response: '0',
    });
  });

  it('should throw on encoding invalid choice', () => {
    const mapped = mapInquiry(mockInquiry);
    const riichiButton = mapped.buttons[2];
    assert(riichiButton, 'riichiButton should be defined');

    // traceId 101 is not legal for riichi (only 102 is)
    expect(() => {
      encodeInquiryResponse(mockInquiry, riichiButton, 101);
    }).toThrow('Tile traceId 101 not in riichi options');
  });

  it('should map and encode a nukidora action', () => {
    const nukiInquiry: ISinglePlayerInquiryMsg = {
      actions: [
        { skipAction: {} },
        { nukiDoraAction: { tiles: [{ traceId: 55, tile: 68 }] } },
      ],
    };
    const mapped = mapInquiry(nukiInquiry);
    const nukiButton = mapped.buttons.find((b) => b.type === 'nukidora');
    assert(nukiButton, 'nukidora button should be defined');
    expect(nukiButton).toEqual({
      type: 'nukidora',
      label: '拔北',
      actionIndex: 1,
      choiceIndex: 0,
    });

    // Submits the (interchangeable) North option index as a plain int.
    const encoded = encodeInquiryResponse(nukiInquiry, nukiButton);
    expect(encoded).toEqual({ index: 1, response: '0' });
  });

  describe('getAutoResponse', () => {
    it('should return play-tile auto-response when only 1 legal tile and no buttons', () => {
      const inq = mapInquiry({
        actions: [
          {
            playTileAction: {
              tiles: [{ traceId: 42, tile: 17 }],
            },
          },
        ],
      });
      const resp = getAutoResponse(inq);
      expect(resp).toEqual({
        action: {
          type: 'play-tile',
          label: '打',
          actionIndex: 0,
          legalTiles: [42],
          candidates: [],
        },
        choice: 42,
      });
    });

    it('should not auto-respond play-tile when multiple legal tiles exist', () => {
      const inq = mapInquiry({
        actions: [
          {
            playTileAction: {
              tiles: [
                { traceId: 42, tile: 17 },
                { traceId: 43, tile: 18 },
              ],
            },
          },
        ],
      });
      const resp = getAutoResponse(inq);
      expect(resp).toBeNull();
    });

    it('should not auto-respond play-tile if buttons exist alongside single discard', () => {
      const inq = mapInquiry({
        actions: [
          {
            skipAction: {},
          },
          {
            playTileAction: {
              tiles: [{ traceId: 42, tile: 17 }],
            },
          },
          {
            agariAction: {
              type: AgariType.AGARI_TYPE_TSUMO,
              incoming: { traceId: 42, tile: 17 },
            },
          },
        ],
      });
      const resp = getAutoResponse(inq);
      expect(resp).toBeNull();
    });

    it('should return auto-response for single button (non next-round)', () => {
      const inq = mapInquiry({
        actions: [
          {
            chiiAction: {
              tileGroups: [
                {
                  tiles: [
                    { traceId: 100, tile: 17 },
                    { traceId: 101, tile: 18 },
                    { traceId: 200, tile: 19 },
                  ],
                },
              ],
            },
          },
        ],
      });
      const resp = getAutoResponse(inq);
      expect(resp).toEqual({
        action: {
          type: 'chii',
          label: '吃',
          actionIndex: 0,
          tileGroups: [
            {
              index: 0,
              tiles: [
                { traceId: 100, tile: 17, isCalled: false },
                { traceId: 101, tile: 18, isCalled: false },
                { traceId: 200, tile: 19, isCalled: false },
              ],
            },
          ],
        },
        choice: 0,
      });
    });

    it('should not auto-respond to next-round button', () => {
      const inq = mapInquiry({
        actions: [
          {
            nextRoundAction: {},
          },
        ],
      });
      const resp = getAutoResponse(inq);
      expect(resp).toBeNull();
    });

    it('should not auto-respond to single button if it has multiple group choices', () => {
      const inq = mapInquiry({
        actions: [
          {
            chiiAction: {
              tileGroups: [
                {
                  tiles: [
                    { traceId: 100, tile: 17 },
                    { traceId: 101, tile: 18 },
                    { traceId: 200, tile: 19 },
                  ],
                },
                {
                  tiles: [
                    { traceId: 101, tile: 18 },
                    { traceId: 102, tile: 19 },
                    { traceId: 200, tile: 20 },
                  ],
                },
              ],
            },
          },
        ],
      });
      const resp = getAutoResponse(inq);
      expect(resp).toBeNull();
    });
  });

  it('should map candidates and tenpaiInfos for playTileAction and riichiAction', () => {
    const inquiryWithCandidates: ISinglePlayerInquiryMsg = {
      actions: [
        {
          playTileAction: {
            tiles: [{ traceId: 100, tile: 17 }],
            candidates: [
              {
                tile: { traceId: 100, tile: 17 },
                tenpaiInfos: [
                  {
                    winningTile: 18,
                    han: 1,
                    yakuHan: 1,
                    fu: 30,
                    yakuman: 0,
                    points: 1000,
                  },
                ],
              },
            ],
          },
        },
        {
          riichiAction: {
            tiles: [{ traceId: 100, tile: 17 }],
            candidates: [
              {
                tile: { traceId: 100, tile: 17 },
                tenpaiInfos: [
                  {
                    winningTile: 19,
                    han: 2,
                    yakuHan: 2,
                    fu: 40,
                    yakuman: 0,
                    points: 2000,
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    // The client derives remainingCount from visible tile kinds: one 18 is
    // visible (so 4 - 1 = 3 remain), no 19 is visible (so 4 remain). With no
    // tile-set counts supplied, the maximum falls back to 4 per kind.
    const mapped = mapInquiry(inquiryWithCandidates, {
      visibleKinds: [18],
      tileSetCounts: new Map(),
    });

    expect(mapped.playTile?.candidates).toBeDefined();
    expect(mapped.playTile?.candidates).toHaveLength(1);
    expect(mapped.playTile?.candidates?.[0]).toEqual({
      tileId: 100,
      tenpaiInfos: [
        {
          winningTile: 18,
          remainingCount: 3,
          han: 1,
          yakuHan: 1,
          fu: 30,
          yakuman: 0,
          points: 1000,
        },
      ],
    });

    const riichiBtn = mapped.buttons.find((b) => b.type === 'riichi');
    expect(riichiBtn).toBeDefined();
    if (riichiBtn) {
      expect(riichiBtn.candidates).toBeDefined();
      expect(riichiBtn.candidates).toHaveLength(1);
      expect(riichiBtn.candidates?.[0]).toEqual({
        tileId: 100,
        tenpaiInfos: [
          {
            winningTile: 19,
            remainingCount: 4,
            han: 2,
            yakuHan: 2,
            fu: 40,
            yakuman: 0,
            points: 2000,
          },
        ],
      });
    }
  });
});

describe('findActiveDiscardCandidate', () => {
  const playCandidate: DiscardCandidate = { tileId: 100, tenpaiInfos: [] };
  const riichiCandidate: DiscardCandidate = { tileId: 100, tenpaiInfos: [] };

  const mapped: MappedInquiry = {
    buttons: [
      {
        type: 'riichi',
        label: '立直',
        actionIndex: 1,
        legalTiles: [100],
        candidates: [riichiCandidate],
      },
    ],
    playTile: {
      actionIndex: 0,
      legalTiles: [100],
      candidates: [playCandidate],
    },
  };

  it('treats the tile as a riichi discard in riichi-select mode', () => {
    // Regression: the same tile appears in both the play-tile and riichi
    // candidate lists. In riichi-select mode it must be counted as riichi
    // (isRiichi=true) so the 番缚 check credits the guaranteed riichi yaku.
    const result = findActiveDiscardCandidate(mapped, 100, true);
    expect(result?.isRiichi).toBe(true);
    expect(result?.candidate).toBe(riichiCandidate);
  });

  it('treats the tile as a normal discard when not in riichi mode', () => {
    const result = findActiveDiscardCandidate(mapped, 100, false);
    expect(result?.isRiichi).toBe(false);
    expect(result?.candidate).toBe(playCandidate);
  });

  it('returns null for a tile that is not a riichi candidate in riichi mode', () => {
    expect(findActiveDiscardCandidate(mapped, 999, true)).toBeNull();
  });

  it('returns null for an unknown tile in normal mode', () => {
    expect(findActiveDiscardCandidate(mapped, 999, false)).toBeNull();
  });
});

describe('getClaimTargetTileId', () => {
  it('should map isCalled correctly and identify claim target tile ID', () => {
    const claimInquiry: ISinglePlayerInquiryMsg = {
      actions: [
        {
          ponAction: {
            tileGroups: [
              {
                tiles: [
                  { traceId: 100, tile: 17 }, // own
                  { traceId: 101, tile: 17 }, // own
                  {
                    traceId: 200,
                    tile: 17,
                    discardInfo: { from: 1 }, // from another player
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    // Case 1: selfSeat = 0, so tile 200 is claimed from seat 1 (isCalled should be true)
    const mapped = mapInquiry(claimInquiry, undefined, 0);
    const ponBtn = mapped.buttons[0];
    assert(ponBtn);
    if (ponBtn.type !== 'pon') throw new Error('Expected pon action');
    expect(ponBtn.tileGroups[0]?.tiles[2]?.isCalled).toBe(true);
    expect(ponBtn.tileGroups[0]?.tiles[0]?.isCalled).toBe(false);

    const targetId = getClaimTargetTileId(mapped);
    expect(targetId).toBe(200);

    // Case 2: if selfSeat = 1, then the tile is discarded by ourselves (should not be marked as isCalled)
    const mappedSelf = mapInquiry(claimInquiry, undefined, 1);
    const ponBtnSelf = mappedSelf.buttons[0];
    assert(ponBtnSelf);
    if (ponBtnSelf.type !== 'pon') throw new Error('Expected pon action');
    expect(ponBtnSelf.tileGroups[0]?.tiles[2]?.isCalled).toBe(false);
    expect(getClaimTargetTileId(mappedSelf)).toBeNull();
  });

  it('should identify Ron target tile ID from agari incomingTileId', () => {
    const ronInquiry: ISinglePlayerInquiryMsg = {
      actions: [
        {
          agariAction: {
            type: AgariType.AGARI_TYPE_RON,
            incoming: { traceId: 300, tile: 18 },
          },
        },
      ],
    };

    const mapped = mapInquiry(ronInquiry);
    const targetId = getClaimTargetTileId(mapped);
    expect(targetId).toBe(300);
  });
});
