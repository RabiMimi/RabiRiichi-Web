/**
 * Shared Tailwind class strings for reused UI primitives.
 */

/**
 * Shared modal shell (dimmed full-screen overlay + centered card + header /
 * title / close button / scrollable body / footer). Replaces the former
 * `.game-info-modal-*` rules reused across the in-game modals. The card's
 * width / background / border are intentionally left to each modal (via
 * MODAL_CARD_DEFAULT or its own utilities) so variants don't conflict.
 */
export const MODAL = {
  overlay:
    'pointer-events-auto fixed inset-0 z-[1000] flex items-center ' +
    'justify-center bg-black/75 backdrop-blur-sm ' +
    // Small screens: pin to top and allow scrolling so tall modals fit.
    'max-md:items-start max-md:overflow-y-auto max-md:p-2.5',
  card:
    'mx-auto box-border flex max-h-[85vh] flex-col rounded-xl p-6 ' +
    'shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,122,153,0.05)] ' +
    'backdrop-blur-[16px] max-md:max-h-[95vh] max-md:p-4',
  cardDefaultLook:
    'w-[90%] max-w-[650px] border-2 border-[#ff7a99] bg-[#121c32]/95',
  header: 'mb-4 flex items-center justify-between border-b border-[#444] pb-2',
  title: 'm-0 text-[1.2rem] text-[#ff7a99]',
  closeButton:
    'cursor-pointer border-none bg-transparent p-0 text-[1.5rem] ' +
    'leading-none text-[#aaa] hover:text-white',
  body: 'flex flex-1 flex-col gap-5 overflow-y-auto pr-2',
  footer: 'mt-4 flex justify-end',
} as const;
