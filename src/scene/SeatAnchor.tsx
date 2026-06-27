import React from 'react';
import { getSeatRotation } from './seat';

interface SeatAnchorProps {
  screenPos: number;
  children: React.ReactNode;
}

export function SeatAnchor({
  screenPos,
  children,
}: SeatAnchorProps): React.JSX.Element {
  const rotation = getSeatRotation(screenPos);
  const radius = 2.4; // Base radius for player elements placement

  // Calculate position on the table edge
  const x = Math.sin(rotation) * radius;
  const z = Math.cos(rotation) * radius;

  // We rotate the group by -rotation so that the player's local space has:
  // - local +Z pointing towards the viewer (away from center)
  // - local -Z pointing towards the table center
  // - local +X pointing to the right of the player
  // - local -X pointing to the left of the player
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {children}
    </group>
  );
}
