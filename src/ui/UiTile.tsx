import React from 'react';
import { getTileTexturePath } from '../scene/assets';

export type UiTileSize =
  'result' | 'dora' | 'action' | 'info' | 'tenpai' | 'custom';

interface UiTileProps {
  tile: string;
  size?: UiTileSize;
  isWinningTile?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<UiTileSize, string> = {
  result: 'w-8 h-auto',
  dora: 'w-8 h-auto',
  action: 'w-6 h-auto lg:w-8 h-auto',
  info: 'w-8 h-auto',
  tenpai: 'w-6 h-auto lg:w-8 h-auto',
  custom: '',
};

export function UiTile({
  tile,
  size = 'result',
  isWinningTile = false,
  className = '',
}: UiTileProps): React.JSX.Element {
  const isBack = tile === 'back';
  const imgSrc = isBack
    ? '/assets/hand_tiles/back.jpg'
    : getTileTexturePath(tile);

  const isCustom = size === 'custom';
  const defaultStyles = isCustom
    ? 'object-cover bg-[#f7f4eb]'
    : 'rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)] object-cover bg-[#f7f4eb]';

  const borderStyle = isCustom
    ? ''
    : isWinningTile
      ? 'border-2 border-[#ff7a99]'
      : 'border border-[#333]';

  return (
    <img
      src={imgSrc}
      alt={isBack ? 'Locked' : tile}
      className={`${defaultStyles} ${borderStyle} ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}
