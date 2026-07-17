export const SOUND_EFFECTS = {
  tile: {
    hover: '/assets/sounds/se/tile/hover.wav',
    discard: '/assets/sounds/se/tile/discard.wav',
  },
  game: {
    deal: '/assets/sounds/se/game/deal.wav',
    turn: '/assets/sounds/se/game/turn.wav',
    call: '/assets/sounds/se/game/call.wav',
    agari: '/assets/sounds/se/game/agari.wav',
    timeoutWarning: '/assets/sounds/se/game/timeout-warning.wav',
    doraReveal: '/assets/sounds/se/game/dora-reveal.wav',
    riichi: '/assets/sounds/se/game/riichi.wav',
  },
  result: {
    hanReveal: '/assets/sounds/se/result/han-reveal.wav',
  },
} as const;

export type SoundEffect =
  | (typeof SOUND_EFFECTS.tile)[keyof typeof SOUND_EFFECTS.tile]
  | (typeof SOUND_EFFECTS.game)[keyof typeof SOUND_EFFECTS.game]
  | (typeof SOUND_EFFECTS.result)[keyof typeof SOUND_EFFECTS.result];
