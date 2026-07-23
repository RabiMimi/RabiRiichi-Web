import React from 'react';
import { useTexture } from '@react-three/drei';
import { TABLE_DIFFUSE_PATH } from './assets';

export function Table(): React.JSX.Element {
  // Load the table texture. useTexture will suspend until loaded.
  const texture = useTexture(TABLE_DIFFUSE_PATH);

  return (
    <group>
      {/* Table Top with cloth texture covering the full size */}
      <mesh position={[0, -0.07, 0]} receiveShadow>
        <boxGeometry args={[5.3, 0.1, 5.3]} />
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  );
}
