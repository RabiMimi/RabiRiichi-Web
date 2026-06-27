import { describe, it, expect } from 'vitest';
import { AgariType } from '../proto/index.js';
import type { ISinglePlayerInquiryMsg } from '../proto/index.js';
import { mapInquiry, encodeInquiryResponse } from './inquiry.js';
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
            { traceId: 100, tile: 17 },
            { traceId: 101, tile: 18 },
            { traceId: 200, tile: 19 },
          ],
        },
      ],
    });

    expect(mapped.buttons[2]).toEqual({
      type: 'riichi',
      label: '立直',
      actionIndex: 3,
      legalTiles: [102],
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
});
