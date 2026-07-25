import React, { Suspense, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { rabiriichi } from '../net/client';
import { Table } from './Table';
import { SeatAnchor } from './SeatAnchor';
import { useRoom, useSelf } from '../state/store';
import { getScreenPosition } from './seat';
import { PlayerArea3D } from './PlayerArea3D';
import { TableCenter } from './TableCenter';
import { ResultAnimation3D } from './ResultAnimation3D';
import { TileOutlineLayer } from './TileOutlineLayer';

function TouchHoverHandler(): null {
  const { camera, scene } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      if (!touch) return;

      // Convert touch coordinates to normalized device coordinates (-1 to +1)
      mouseRef.current.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(touch.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Perform intersection check
      const intersects = raycasterRef.current.intersectObjects(
        scene.children,
        true,
      );
      let foundTraceId: number | null = null;
      let hitAnyTile = false;

      for (const hit of intersects) {
        // Walk up to find the group with userData.traceId
        let curr: THREE.Object3D | null = hit.object;
        while (curr) {
          const traceId = curr.userData.traceId as unknown;
          if (typeof traceId === 'number') {
            hitAnyTile = true;
            // Note: "Note this doesn't apply to hand tiles."
            if (curr.userData.area !== 'hand') {
              foundTraceId = traceId;
            }
            break;
          }
          curr = curr.parent;
        }
        if (hitAnyTile) break;
      }

      // Update hover state
      if (foundTraceId !== null) {
        if (rabiriichi.hoveredTileTraceId !== foundTraceId) {
          rabiriichi.hoverTile(foundTraceId);
        }
      } else {
        if (rabiriichi.hoveredTileTraceId !== null) {
          rabiriichi.hoverTile(null);
        }
      }
    };

    const handleTouchEnd = () => {
      if (rabiriichi.hoveredTileTraceId !== null) {
        rabiriichi.hoverTile(null);
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [camera, scene]);

  return null;
}

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

    // The winning tile is shared table-wide, so resolve it once here rather than
    // rescanning every player inside each PlayerArea3D.
    const winningTileTraceId =
      room.players.find((p) => p.gameState?.agari?.incoming)?.gameState?.agari
        ?.incoming?.traceId ?? null;

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
            screenPos={screenPos}
            playerCount={playerCount}
            tileRegistry={room.tileRegistry}
            winningTileTraceId={winningTileTraceId}
          />
        </SeatAnchor>
      );
    });
  };

  return (
    <group>
      <color attach="background" args={['#000000']} />
      <TouchHoverHandler />
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

      <Suspense fallback={null}>
        <ResultAnimation3D />
      </Suspense>

      {/* Player seat anchors */}
      {renderPlayerElements()}

      {/* Every tile's toon outline, batched into one instanced draw call. */}
      <Suspense fallback={null}>
        <TileOutlineLayer />
      </Suspense>
    </group>
  );
}
