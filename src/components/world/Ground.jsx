// ============================================================
// Ground — Base ground plane for the world
// ============================================================

import { GRID, COLORS } from '../../constants/world.js';

const SIZE = GRID.WORLD_SIZE + 40; // margin beyond the road edges

export default function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[SIZE, SIZE]} />
      <meshStandardMaterial color={COLORS.GROUND} />
    </mesh>
  );
}
