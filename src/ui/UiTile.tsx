import React from 'react';
import { getTileTexturePath } from '../scene/assets';
import { RESULT } from './styles';

export type UiTileSize =
  'result' | 'dora' | 'action' | 'info' | 'tenpai' | 'custom';

interface UiTileProps {
  tile: string;
  size?: UiTileSize;
  isWinningTile?: boolean;
  isHighlighted?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_CLASSES: Record<UiTileSize, string> = {
  // A result row holds a 14-tile hand plus melds, so this has to stay small
  // enough to fit on one line; see RESULT.tile for the viewport scaling.
  result: RESULT.tile,
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
  isHighlighted = false,
  className = '',
  style,
}: UiTileProps): React.JSX.Element {
  const isBack = tile === 'back';
  const imgSrc = isBack
    ? '/assets/hand_tiles/back.jpg'
    : getTileTexturePath(tile);

  const isCustom = size === 'custom';
  const defaultStyles = isCustom
    ? 'object-contain bg-[#f7f4eb]'
    : 'rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)] object-cover bg-[#f7f4eb]';

  let borderStyle: string;
  if (isWinningTile) {
    borderStyle = 'border-2 border-[#ff7a99]';
  } else if (isCustom) {
    // The DOM hand draws its own frame around the tile.
    borderStyle = '';
  } else if (isHighlighted) {
    borderStyle =
      'border-2 border-[#66ccff] shadow-[0_0_4px_rgba(102,204,255,0.8)]';
  } else {
    borderStyle = 'border border-[#333]';
  }

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
