import React, { Suspense } from 'react';
import { Table } from './Table';
import { SeatAnchor } from './SeatAnchor';
import { useRoom, useSelf } from '../state/store';
import { getScreenPosition } from './seat';
import { PlayerArea3D } from './PlayerArea3D';
import { TableCenter } from './TableCenter';

export function GameTable(): React.JSX.Element {
  const room = useRoom();
  const currentUser = useSelf();

  const renderPlayerElements = () => {
    if (!room || !currentUser) {
      return null;
    }

    const selfPlayer = room.players.find((p) => p.id === currentUser.id);
    const selfSeat = selfPlayer?.seat;

    if (selfSeat === undefined) {
      return null;
    }

    const playerCount = room.config?.playerCount ?? 2;

    return room.players.map((player) => {
      if (player.seat === undefined || !player.gameState) {
        return null;
      }

      const screenPos = getScreenPosition(player.seat, selfSeat, playerCount);
      const isLocal = player.id === currentUser.id;

      return (
        <SeatAnchor key={player.id} screenPos={screenPos}>
          <PlayerArea3D
            player={player}
            isLocal={isLocal}
            seat={player.seat}
            playerCount={playerCount}
            tileRegistry={room.tileRegistry}
          />
        </SeatAnchor>
      );
    });
  };

  return (
    <group>
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} />

      {/* 3D Table and Center Indicator */}
      <Suspense fallback={null}>
        <Table />
        <TableCenter />
      </Suspense>

      {/* Grid helper for development/alignment */}
      <gridHelper
        args={[6, 12, '#333333', '#222222']}
        position={[0, -0.01, 0]}
      />

      {/* Player seat anchors */}
      {renderPlayerElements()}
    </group>
  );
}
