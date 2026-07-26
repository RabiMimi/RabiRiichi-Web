import React from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import {
  useAutoAgari,
  useAutoDiscard,
  useAutoNuki,
  useNoCalls,
  useRoom,
} from '../state/store';
import { IconButton } from './IconButton';
import { Tooltip } from './Tooltip';
import { DoraOption } from '../proto';

interface AutoPlayControl {
  key: string;
  isActive: boolean;
  label: string;
  description: string;
  onToggle: () => void;
}

const ACTIVE_CLASS =
  '!border-[#ff7a99] !bg-[#ff7a99]/15 !text-[#ff7a99] ' +
  'shadow-[0_0_10px_rgba(255,122,153,0.3),inset_0_0_4px_rgba(255,122,153,0.2)]';
const SQUARE_CLASS = '!h-9 !w-9 !p-0';

export function AutoPlayControls(): React.JSX.Element {
  const { t } = useTranslation();
  const autoAgari = useAutoAgari();
  const noCalls = useNoCalls();
  const autoDiscard = useAutoDiscard();
  const autoNuki = useAutoNuki();
  const room = useRoom();

  const controls: AutoPlayControl[] = [
    {
      key: 'autoAgari',
      isActive: Boolean(autoAgari),
      label: t('hud.autoAgari', 'Win'),
      description: t(
        'hud.autoAgariDesc',
        'Automatically declare Win (Ron/Tsumo) when available',
      ),
      onToggle: () => rabiriichi.toggleAutoAgari(),
    },
    {
      key: 'noCalls',
      isActive: Boolean(noCalls),
      label: t('hud.noCalls', 'No Calls'),
      description: t(
        'hud.noCallsDesc',
        'Never claim discards from other players (Chii/Pon/Kan)',
      ),
      onToggle: () => rabiriichi.toggleNoCalls(),
    },
    {
      key: 'autoDiscard',
      isActive: Boolean(autoDiscard),
      label: t('hud.autoDiscard', 'Auto Discard'),
      description: t(
        'hud.autoDiscardDesc',
        'Automatically discard drawn tile if no other actions are possible',
      ),
      onToggle: () => rabiriichi.toggleAutoDiscard(),
    },
  ];

  const doraOption = room?.config?.doraOption;
  if (
    doraOption != null &&
    (doraOption & DoraOption.DORA_OPTION_NUKI_DORA) !== 0
  ) {
    controls.push({
      key: 'autoNuki',
      isActive: Boolean(autoNuki),
      label: t('hud.autoNuki', 'Auto Nuki'),
      description: t(
        'hud.autoNukiDesc',
        'Automatically declare Kita (Nukidora) if available',
      ),
      onToggle: () => rabiriichi.toggleAutoNuki(),
    });
  }

  return (
    <div className="flex max-w-[320px] flex-row flex-wrap gap-2">
      {controls.map((control) => (
        <Tooltip
          key={control.key}
          content={control.description}
          position="bottom"
        >
          <IconButton
            type="button"
            className={`${SQUARE_CLASS} ${
              control.isActive ? ACTIVE_CLASS : ''
            }`}
            aria-label={control.label}
            aria-pressed={control.isActive}
            onClick={control.onToggle}
          >
            <span className="flex h-full w-full items-center justify-center text-center text-md font-bold leading-none">
              {control.label}
            </span>
          </IconButton>
        </Tooltip>
      ))}
    </div>
  );
}
