import React from 'react';
import { WILDCARD_TILE_STRING } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';
import { RESULT } from './styles';

export type UiTileSize =
  'result' | 'dora' | 'action' | 'info' | 'tenpai' | 'custom';

interface UiTileProps {
  tile: string;
  size?: UiTileSize;
  isWinningTile?: boolean;
  isHighlighted?: boolean;
  /** The face shows what a wildcard stood for; mark it as such. */
  fromWildcard?: boolean;
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
  fromWildcard = false,
  className = '',
  style,
}: UiTileProps): React.JSX.Element {
  if (fromWildcard) {
    return (
      <WildcardFrame
        tile={tile}
        size={size}
        isWinningTile={isWinningTile}
        className={className}
        style={style}
      />
    );
  }
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

/**
 * A tile a wildcard stood in for: the effective face inside a flowing rainbow
 * ring, with the wildcard's own face pinned to the corner.
 */
function WildcardFrame({
  tile,
  size,
  isWinningTile,
  className,
  style,
}: {
  tile: string;
  size: UiTileSize;
  isWinningTile: boolean;
  className: string;
  style: React.CSSProperties | undefined;
}): React.JSX.Element {
  return (
    <span
      className={`wildcard-ring relative inline-flex shrink-0 rounded-[3px] p-[2px] ${className}`}
      style={style}
      title={WILDCARD_TILE_STRING}
    >
      <UiTile
        tile={tile}
        size={size}
        isWinningTile={isWinningTile}
        className="!border-0 !shadow-none"
      />
      <img
        src={getTileTexturePath(WILDCARD_TILE_STRING)}
        alt={WILDCARD_TILE_STRING}
        draggable={false}
        className="absolute -right-1 -top-1 w-[42%] rounded-[2px] border border-white bg-white shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
      />
    </span>
  );
}
