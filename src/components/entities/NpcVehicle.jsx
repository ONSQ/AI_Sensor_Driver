// ============================================================
// NpcVehicle — Simple box-based car mesh (body + cabin)
// Subtypes: 'parked' (static) or 'moving' (animated by tick).
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Dimensions
const BODY_LENGTH = 4.0; // Z
const BODY_HEIGHT = 1.1; // Y
const BODY_WIDTH = 1.7; // X
const CABIN_LENGTH = 2.0; // Z
const CABIN_HEIGHT = 0.8; // Y
const CABIN_WIDTH = 1.6; // X
const BODY_Y_OFFSET = 0.35; // bottom of body above ground
const CABIN_Z_OFFSET = -0.3; // cabin shifted slightly forward

/**
 * Darken a hex color string by the given amount (0–1).
 */
function darkenColor(hex, amount = 0.2) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, -amount);
  return `#${c.getHexString()}`;
}

export default function NpcVehicle({ entity }) {
  const cabinColor = useMemo(
    () => darkenColor(entity.color, 0.2),
    [entity.color],
  );

  const bodyY = BODY_Y_OFFSET + BODY_HEIGHT / 2; // 0.9
  const cabinY = BODY_Y_OFFSET + BODY_HEIGHT + CABIN_HEIGHT / 2; // 1.85

  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
      groupRef.current.rotation.set(0, entity.heading, 0);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[BODY_WIDTH, BODY_HEIGHT, BODY_LENGTH]} />
        <meshStandardMaterial color={entity.color} />
      </mesh>

      {/* Cabin / windshield area */}
      <mesh position={[0, cabinY, CABIN_Z_OFFSET]} castShadow>
        <boxGeometry args={[CABIN_WIDTH, CABIN_HEIGHT, CABIN_LENGTH]} />
        <meshStandardMaterial
          color={cabinColor}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}
