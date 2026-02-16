// ============================================================
// Building — Single building mesh with optional pitched roof
// All geometry is raycast-compatible for future LiDAR.
// ============================================================

import { memo } from 'react';
import { COLORS } from '../../constants/world.js';

const Building = memo(function Building({ position, width, height, depth, color, roofType }) {
  const y = height / 2; // box origin is center, so lift half-height

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Main building body */}
      <mesh position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Pitched roof for residential buildings */}
      {roofType === 'pitched' && (
        <mesh position={[0, height + 1.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[Math.max(width, depth) * 0.55, 3, 4]} />
          <meshStandardMaterial color={COLORS.RESIDENTIAL_ROOF} />
        </mesh>
      )}
    </group>
  );
});

export default Building;
