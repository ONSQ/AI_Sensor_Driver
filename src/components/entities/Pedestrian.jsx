// ============================================================
// Pedestrian — Simple humanoid mesh (cylinder body + sphere head)
// Positioned/rotated by entity state from useEntityStore.
// ============================================================

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Lighten a hex color string by the given amount (0–1).
 * Returns a hex string like '#rrggbb'.
 */
function lightenColor(hex, amount = 0.3) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

export default function Pedestrian({ entity }) {
  const headColor = useMemo(
    () => lightenColor(entity.color, 0.25),
    [entity.color],
  );

  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
      groupRef.current.rotation.set(0, entity.heading, 0);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body — cylinder: radiusTop, radiusBottom, height, radialSegments */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1.2, 8]} />
        <meshStandardMaterial color={entity.color} />
      </mesh>

      {/* Head — sphere sitting on top of body */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial color={headColor} />
      </mesh>
    </group>
  );
}
