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

/**
 * Shared screen layout primitives.
 */
export const SCREEN = {
  // Base overlay screen that covers the viewport (replaces `.ui-screen`)
  base:
    'absolute inset-0 z-[100] flex h-full w-full box-border items-center justify-center ' +
    'bg-[#141414]/85 p-5 text-[#f0f0f0] backdrop-blur-[4px] overflow-y-auto ' +
    // Responsive: align items to start on short screens to support scrolling
    'max-h-[550px]:items-start',
  // Reusable card container (replaces `.ui-card`)
  card:
    'm-auto box-border w-full max-w-[400px] rounded-2xl border border-[#82aaf0]/25 ' +
    'bg-[#121c32]/82 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(255,122,153,0.04)] ' +
    'backdrop-blur-[16px]',
  // Screen title with linear gradient text (replaces `.ui-title`)
  title:
    'm-0 mb-1 text-center text-[2.5rem] font-extrabold tracking-[1px] ' +
    'bg-gradient-to-br from-[#ff7a99] to-[#80deea] bg-clip-text text-transparent',
  // Screen subtitle (replaces `.ui-subtitle`)
  subtitle:
    'm-0 mb-6 text-center text-[0.95rem] uppercase tracking-[3px] text-white/60',
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
  label: 'text-[0.9rem] font-semibold text-[#ccc]',
  // Inline label (aligned on left, fixed minimum width to align inputs)
  labelInline:
    'text-[0.82rem] font-semibold text-[#ccc] shrink-0 w-[75px] text-right whitespace-nowrap',
  // Input fields
  input:
    'h-10 rounded-lg border border-[#555] bg-[#1a1a1a] px-3 py-2 text-base text-white ' +
    'outline-none transition-colors duration-200 focus:border-[#ff7a99] disabled:cursor-not-allowed disabled:opacity-50',
  // Inline inputs/selects (slightly smaller padding)
  inputInline:
    'h-8 flex-1 min-w-0 rounded-lg border border-[#555] bg-[#1a1a1a] px-2.5 py-1.5 text-[0.88rem] text-white ' +
    'outline-none transition-colors duration-200 focus:border-[#ff7a99] disabled:cursor-not-allowed disabled:opacity-50',
  // Inline wrapper error text
  fieldError: 'text-[0.72rem] text-[#ff6666] pl-[83px] text-left mt-0.5',
  // Standard full-width error container
  error:
    'rounded-lg border border-[#ff0000]/30 bg-[#ff0000]/15 p-2.5 text-center text-[0.9rem] text-[#ff6666]',
} as const;
