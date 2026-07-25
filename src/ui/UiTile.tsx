import React from 'react';
import { getTileTexturePath } from '../scene/assets';

export type UiTileSize =
  'result' | 'dora' | 'action' | 'info' | 'tenpai' | 'hand' | 'custom';

interface UiTileProps {
  tile: string;
  size?: UiTileSize;
  isWinningTile?: boolean;
  isHighlighted?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_CLASSES: Record<UiTileSize, string> = {
  result: 'w-16 h-auto',
  dora: 'w-8 h-auto',
  action: 'w-6 h-auto lg:w-8 h-auto',
  info: 'w-8 h-auto',
  tenpai: 'w-6 h-auto lg:w-8 h-auto',
  hand: 'w-32 h-auto',
  custom: '',
};

export function UiTile({
  tile,
  size = 'result',
  isWinningTile = false,
  isHighlighted = false,
  className = '',
  style,
}: UiTileProps): React.JSX.Element {
  const isBack = tile === 'back';
  const imgSrc = isBack
    ? '/assets/hand_tiles/back.jpg'
    : getTileTexturePath(tile);

  const isCustom = size === 'custom';
  const isHand = size === 'hand';
  const defaultStyles = isCustom
    ? 'object-contain bg-[#f7f4eb]'
    : isHand
      ? 'rounded object-cover bg-[#f7f4eb]'
      : 'rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)] object-cover bg-[#f7f4eb]';

  const borderStyle =
    isCustom || isHand
      ? isWinningTile
        ? 'border-2 border-[#ff7a99]'
        : ''
      : isWinningTile
        ? 'border-2 border-[#ff7a99]'
        : isHighlighted
          ? 'border-2 border-[#66ccff] shadow-[0_0_4px_rgba(102,204,255,0.8)]'
          : 'border border-[#333]';

  return (
    <img
      src={imgSrc}
      alt={isBack ? 'Locked' : tile}
      draggable={false}
      className={`${defaultStyles} ${borderStyle} ${SIZE_CLASSES[size]} ${className}`}
      style={style}
    />
  );
}
