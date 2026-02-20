// ============================================================
// Ball — Small red sphere sitting on the ground plane.
// Used as a hazard / distraction entity in the simulation.
// ============================================================

const RADIUS = 0.15;
const COLOR = '#ff2222';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Ball({ entity }) {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
      groupRef.current.rotation.set(0, entity.heading, 0); // optional for ball unless rolling visuals needed
    }
  });
  return (
    <group ref={groupRef}>
      <mesh position={[0, RADIUS, 0]} castShadow>
        <sphereGeometry args={[RADIUS, 12, 8]} />
        <meshStandardMaterial color={COLOR} />
      </mesh>
    </group>
  );
}
