import React from 'react';
import { useTexture } from '@react-three/drei';
import { TABLE_DIFFUSE_PATH } from './assets';

export function Table(): React.JSX.Element {
  // Load the table texture. useTexture will suspend until loaded.
  const texture = useTexture(TABLE_DIFFUSE_PATH);

  return (
    <group>
      {/* Table Top with cloth texture */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[5, 0.1, 5]} />
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Table border / frame (dark wood or plastic) */}
      <mesh position={[0, -0.05, 0]}>
        {/* We can represent the border using box geometries or a single thick border box */}
        {/* For simplicity, a slightly larger box underneath the table top */}
        <boxGeometry args={[5.3, 0.08, 5.3]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
    </group>
  );
}
