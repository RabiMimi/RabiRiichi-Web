/**
 * Pure helpers that turn a {@link MappedInquiry} into the choices the terminal
 * action bar presents, and classify what secondary selection (if any) each
 * button needs. Kept Ink-free and unit-tested; the component drives keyboard
 * interaction using these.
 */
import type { ActionOption, MappedInquiry } from '../../domain/inquiry';

/**
 * Localized label for an action button. The domain layer stamps hardcoded
 * Chinese fallback labels on each option (client-side localization is a UI
 * concern), so the CLI maps the option `type` to `hud.action.*` keys — mirroring
 * the web client. Agari resolves to tsumo vs ron using the fallback label.
 */
export function actionLabel(
  action: ActionOption,
  t: (key: string) => string,
): string {
  switch (action.type) {
    case 'skip':
      return t('hud.action.skip');
    case 'ryuukyoku':
      return t('hud.action.ryuukyoku');
    case 'chii':
      return t('hud.action.chii');
    case 'pon':
      return t('hud.action.pon');
    case 'kan':
      return t('hud.action.kan');
    case 'nukidora':
      return t('hud.action.nukidora');
    case 'riichi':
      return t('hud.action.riichi');
    case 'agari':
      return action.label === '自摸'
        ? t('hud.action.tsumo')
        : t('hud.action.ron');
    case 'next-round':
      return t('result.confirm');
    case 'play-tile':
      return action.label;
  }
}

/** What extra input a chosen action needs before it can be submitted. */
export type ActionFollowUp =
  | { kind: 'none' } // submit immediately
  | { kind: 'group' } // pick one of action.tileGroups
  | { kind: 'discard'; riichi: boolean }; // pick a tile (traceId) to discard

/** Determines the follow-up interaction required by an action option. */
export function followUpFor(action: ActionOption): ActionFollowUp {
  switch (action.type) {
    case 'chii':
    case 'pon':
    case 'kan':
      // A single group can be auto-selected; multiple needs a choice.
      return action.tileGroups.length > 1
        ? { kind: 'group' }
        : { kind: 'none' };
    case 'riichi':
      return { kind: 'discard', riichi: true };
    case 'skip':
    case 'agari':
    case 'nukidora':
    case 'ryuukyoku':
    case 'next-round':
    case 'play-tile':
      return { kind: 'none' };
  }
}

/**
 * The `choice` value to pass to `submitInquiryResponse` for an action that
 * needs no interactive follow-up. Returns `undefined` when the action requires
 * one (group/discard) and thus can't be auto-resolved here.
 */
export function autoChoiceFor(action: ActionOption): number | undefined {
  switch (action.type) {
    case 'chii':
    case 'pon':
    case 'kan':
      return action.tileGroups.length === 1
        ? action.tileGroups[0]?.index
        : undefined;
    case 'nukidora':
      return action.choiceIndex;
    case 'skip':
    case 'agari':
    case 'ryuukyoku':
    case 'next-round':
      return undefined; // encoded as {} by the client; no choice needed
    case 'riichi':
    case 'play-tile':
      return undefined; // needs a discard tile
  }
}

/** True when the inquiry offers a normal discard (our turn to play a tile). */
export function hasDiscard(mapped: MappedInquiry): boolean {
  return mapped.playTile !== undefined;
}

/** The set of tile traceIds that are legal to discard for a discard follow-up. */
export function legalDiscardIds(
  mapped: MappedInquiry,
  riichi: boolean,
): number[] {
  if (riichi) {
    const riichiBtn = mapped.buttons.find((b) => b.type === 'riichi');
    return riichiBtn?.type === 'riichi' ? riichiBtn.legalTiles : [];
  }
  return mapped.playTile?.legalTiles ?? [];
}
