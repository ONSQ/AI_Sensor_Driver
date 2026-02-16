// ============================================================
// Block — One city block: ground cover + buildings
// ============================================================

import { memo } from 'react';
import Building from './Building.jsx';
import { ZONE_TYPES, COLORS } from '../../constants/world.js';

const GROUND_ZONES = new Set([
  ZONE_TYPES.RESIDENTIAL,
  ZONE_TYPES.SCHOOL,
]);

const Block = memo(function Block({ data }) {
  const { buildings, zone, center, bounds } = data;
  const isGreen = GROUND_ZONES.has(zone);
  const blockW = bounds.maxX - bounds.minX;
  const blockD = bounds.maxZ - bounds.minZ;

  return (
    <group>
      {/* Block ground cover — grass for residential/school, concrete for city/etc */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[center[0], 0.005, center[2]]}
        receiveShadow
      >
        <planeGeometry args={[blockW, blockD]} />
        <meshStandardMaterial color={isGreen ? COLORS.GRASS : COLORS.BLOCK_CONCRETE} />
      </mesh>

      {/* Buildings */}
      {buildings.map((b, i) => (
        <Building key={i} {...b} />
      ))}
    </group>
  );
});

export default Block;
