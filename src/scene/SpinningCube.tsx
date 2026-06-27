import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Mesh } from 'three';

/**
 * A minimal demo object: a slowly rotating cube. Replace this with mahjong
 * table / tile rendering as the client grows.
 */
export function SpinningCube(): React.JSX.Element {
  const meshRef = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.rotation.x += delta * 0.4;
      mesh.rotation.y += delta * 0.6;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#e85a8a" />
    </mesh>
  );
}
