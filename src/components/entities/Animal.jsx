// ============================================================
// Animal — Simple box-based animal mesh
// Subtypes: 'dog' (small) or 'deer' (larger).
// Box args: [width(X), height(Y), depth(Z)]
// ============================================================

// Dimensions per subtype — [width(X), height(Y), depth(Z)]
const DIMS = {
  dog: [0.3, 0.5, 0.8],
  deer: [0.4, 1.2, 1.5],
};

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Animal({ entity }) {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
      groupRef.current.rotation.set(0, entity.heading, 0);
    }
  });
  const dims = DIMS[entity.subtype] || DIMS.dog;
  const centerY = dims[1] / 2; // sit on ground plane

  return (
    <group ref={groupRef}>
      <mesh position={[0, centerY, 0]} castShadow>
        <boxGeometry args={dims} />
        <meshStandardMaterial color={entity.color} />
      </mesh>
    </group>
  );
}
