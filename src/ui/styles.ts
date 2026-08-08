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
    'select-text pointer-events-auto fixed inset-0 z-[1000] flex items-center ' +
    'justify-center bg-black/75 backdrop-blur-sm ' +
    // Small screens: pin to top and allow scrolling so tall modals fit.
    'max-md:items-start max-md:overflow-y-auto max-md:p-2.5',
  card:
    'mx-auto box-border flex max-h-[85vh] flex-col rounded-xl px-6 py-4 ' +
    'shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,122,153,0.05)] ' +
    'backdrop-blur-[16px] max-md:max-h-[95vh] max-md:px-4 max-md:py-3',
  cardDefaultLook:
    'w-[90%] max-w-[650px] border-2 border-[#ff7a99] bg-[#1a1a1a]/95',
  header:
    'mb-2.5 flex items-center justify-between border-b border-white/10 pb-1.5',
  title: 'm-0 text-xl text-[#ff7a99]',
  closeButton:
    'cursor-pointer border-none bg-transparent p-0 text-[1.5rem] ' +
    'leading-none text-[#aaa] hover:text-white',
  body: 'flex flex-1 flex-col gap-3.5 overflow-y-auto pr-2',
  footer: 'mt-2.5 flex justify-end',
} as const;

/**
 * Shared screen layout primitives.
 */
export const SCREEN = {
  // Base overlay screen that covers the viewport (replaces `.ui-screen`)
  base:
    'fixed inset-0 z-[100] flex h-full w-full box-border items-center justify-center ' +
    'bg-[#141414]/85 p-5 text-[#f0f0f0] backdrop-blur-[4px] overflow-y-auto ' +
    // Responsive: align items to start on short screens to support scrolling
    'max-h-[550px]:items-start',
  // Reusable card container (replaces `.ui-card`)
  card:
    'm-auto box-border w-full max-w-[400px] rounded-2xl border border-white/10 ' +
    'bg-[#1a1a1a]/90 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(255,122,153,0.04)] ' +
    'backdrop-blur-[16px]',
  // Screen title with linear gradient text (replaces `.ui-title`)
  title:
    'm-0 mb-1 text-center text-[2.5rem] font-extrabold tracking-[1px] ' +
    'bg-gradient-to-br from-[#ff7a99] to-[#80deea] bg-clip-text text-transparent',
  // Screen subtitle (replaces `.ui-subtitle`)
  subtitle:
    'm-0 mb-6 text-center text-sm sm:text-base uppercase tracking-[3px] text-white/60',
} as const;

/**
 * Sizing for the image-based in-game HUD (call buttons, countdown digits).
 *
 * These scale off viewport *height*: the target is landscape play, where height
 * is the scarce axis — a phone in landscape is only ~390px tall, so the desktop
 * 80px artwork would eat a fifth of the screen. `clamp()` keeps the desktop size
 * unchanged while shrinking gracefully on short viewports.
 */
export const HUD = {
  /** Call / action artwork (chii, pon, kan, riichi, agari, skip…). */
  actionImage: 'h-[clamp(2.5rem,9vh,5rem)] w-auto object-contain',
  /** Countdown timer digits. */
  timerDigit: 'h-[clamp(2.5rem,9vh,5rem)] w-auto',
  /**
   * Gap between action buttons. Wide on desktop (the artwork is airy), but it
   * must not push buttons off a narrow landscape screen.
   */
  actionRowGap: 'gap-[clamp(0.75rem,4vw,5rem)]',
} as const;

/**
 * Sizing for the end-of-hand result card.
 *
 * Same viewport-height basis as {@link HUD}: the card stacks tiles, the yaku
 * grid and the score line, so the vertical budget runs out first in landscape.
 */
export const RESULT = {
  /**
   * Hand / meld / river tiles on the result card.
   *
   * The widest thing this has to survive is a 14-tile hand split into four
   * melds, which needs roughly `19 x tileWidth` of line once separators and
   * gaps are counted, against the ~68% of viewport width the card leaves. That
   * breaks even around 60px at 1080p and 45px at 768p, so the cap sits below
   * both. The old 36px ceiling was reached on any screen taller than 1000px,
   * which is what made the tiles look shrunken on a desktop.
   */
  tile: 'w-[clamp(1.5rem,5vh,3.25rem)] h-auto',
  /** Yaku name + han count rows. */
  yakuRow: 'text-[clamp(0.7rem,1.9vh,1rem)]',
  /** The large han and points figures on the score line. */
  scoreFigure: 'text-[clamp(1.25rem,4.2vh,2.5rem)]',
  /** The fu figure, a secondary number beside the han. */
  scoreFu: 'text-[clamp(0.7rem,1.9vh,1rem)]',
  /** Limit name (mangan, haneman, yakuman…). */
  limitLabel: 'text-[clamp(1rem,3.4vh,2rem)]',
} as const;

/**
 * Shared panel and sub-card layout primitives.
 */
export const PANEL = {
  // Container for sub-sections or lobby panels (replaces raw dark-gray borders)
  base: 'bg-[#202020] border border-white/10 rounded-2xl p-6 shadow-lg',
} as const;

export const SUB_CARD = {
  // Default inner card (lighter dark gray using relative opacity)
  default:
    'bg-white/[0.04] border border-white/10 rounded-xl p-4 transition-colors duration-200',
  // Active/highlighted inner card (pink themed)
  active:
    'bg-[#ff7a99]/10 border border-[#ff7a99]/30 rounded-xl p-4 transition-colors duration-200',
  // Empty/placeholder inner card (dashed)
  empty: 'bg-white/[0.01] border border-dashed border-white/5 rounded-xl p-4',
} as const;

/**
 * Shared form layout primitives (inputs, labels, layout groups).
 */
export const FORM = {
  // Vertically stacked form container
  form: 'flex flex-col gap-4',
  // Vertically stacked form group (label + input)
  group: 'flex flex-col gap-1.5',
  // Horizontal/inline form group (label on left, input on right)
  groupInline: 'flex flex-row items-center gap-2 w-full min-w-0',
  // Vertically stacked inline group wrapper (handles inline field errors)
  groupInlineWrapper: 'flex flex-col gap-0.5 w-full min-w-0',
  // Field label
  label: 'text-sm font-semibold text-[#ccc]',
  // Inline label (aligned on left, fixed minimum width to align inputs)
  labelInline:
    'text-sm font-semibold text-[#ccc] shrink-0 w-[110px] text-right whitespace-nowrap',
  // Input fields
  input:
    'h-10 rounded-full border border-[#555] bg-[#1a1a1a] px-4 py-2 text-base text-white ' +
    'outline-none transition-colors duration-200 focus:border-[#ff7a99] disabled:cursor-not-allowed disabled:opacity-50',
  // Inline inputs/selects (slightly smaller padding)
  inputInline:
    'h-8 flex-1 min-w-0 rounded-full border border-[#555] bg-[#1a1a1a] px-3 py-1.5 text-sm text-white ' +
    'outline-none transition-colors duration-200 focus:border-[#ff7a99] disabled:cursor-not-allowed disabled:opacity-50',
  // Select fields (uses custom chevron to avoid native square/right-angle arrows).
  //
  // The chevron data URI is repeated per size rather than composed, because
  // Tailwind only generates a utility it can find literally in the source; a
  // string built at runtime produces no CSS. Keep the three in sync, and keep
  // them in sync with <ChevronDown>, which draws the same polyline as an
  // element for the places that are buttons rather than selects.
  select:
    'h-10 rounded-full border border-[#555] bg-[#1a1a1a] pl-4 pr-9 py-2 text-base text-white ' +
    'outline-none transition-colors duration-200 focus:border-[#ff7a99] disabled:cursor-not-allowed disabled:opacity-50 ' +
    'appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.7)%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E")] bg-[length:1rem_1rem] bg-[right_0.75rem_center] bg-no-repeat',
  selectInline:
    'h-8 flex-1 min-w-0 rounded-full border border-[#555] bg-[#1a1a1a] pl-3 pr-8 py-1.5 text-sm text-white ' +
    'outline-none transition-colors duration-200 focus:border-[#ff7a99] disabled:cursor-not-allowed disabled:opacity-50 ' +
    'appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.7)%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E")] bg-[length:0.875rem_0.875rem] bg-[right_0.6rem_center] bg-no-repeat',
  // The smallest size, for dense HUD and settings rows.
  selectCompact:
    'h-7 min-w-0 rounded-full border border-[#555] bg-[#1a1a1a] pl-2.5 pr-7 py-0.5 text-xs text-white ' +
    'outline-none transition-colors duration-200 focus:border-[#ff7a99] disabled:cursor-not-allowed disabled:opacity-50 ' +
    'appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.7)%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E")] bg-[length:0.75rem_0.75rem] bg-[right_0.5rem_center] bg-no-repeat',
  // Inline wrapper error text
  fieldError: 'text-xs text-[#ff6666] pl-[118px] text-left mt-0.5',
  // Standard full-width error container
  error:
    'rounded-lg border border-[#ff0000]/30 bg-[#ff0000]/15 p-2.5 text-center text-sm text-[#ff6666]',
} as const;
