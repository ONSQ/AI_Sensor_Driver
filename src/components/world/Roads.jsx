// ============================================================
// Roads — Road surfaces, sidewalks, intersections, markings
// ============================================================

import { memo } from 'react';
import { COLORS } from '../../constants/world.js';

// Sidewalk pair for a road segment (two strips, one on each side)
function Sidewalk({ data }) {
  return (
    <mesh position={[data.position[0], data.position[1] || 0.05, data.position[2]]}>
      <boxGeometry args={[data.width, 0.1, data.depth]} />
      <meshStandardMaterial color={COLORS.SIDEWALK} />
    </mesh>
  );
}

const Roads = memo(function Roads({ data }) {
  const { segments, intersections, crosswalks, laneMarkings, sidewalks } = data;

  return (
    <group>
      {/* Road segments */}
      {segments.map((seg) => (
        <mesh
          key={seg.id}
          position={[seg.center[0], 0.01, seg.center[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry
            args={
              seg.orientation === 'horizontal'
                ? [seg.length, seg.width]
                : [seg.width, seg.length]
            }
          />
          <meshStandardMaterial color={COLORS.ROAD} />
        </mesh>
      ))}

      {/* Intersections */}
      {intersections.map((inter) => (
        <mesh
          key={inter.id}
          position={[inter.position[0], 0.01, inter.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[inter.size, inter.size]} />
          <meshStandardMaterial color={COLORS.ROAD} />
        </mesh>
      ))}

      {/* Sidewalks */}
      {sidewalks.map((sw, i) => (
        <Sidewalk key={`sw-${i}`} data={sw} />
      ))}

      {/* Lane markings — dashed or solid double-yellow center lines */}
      {laneMarkings.map((mark, i) => (
        <mesh
          key={`lm-${i}`}
          position={[mark.position[0], mark.position[1] || 0.02, mark.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[mark.width, mark.length]} />
          <meshStandardMaterial color={mark.color || COLORS.ROAD_MARKING} />
        </mesh>
      ))}

      {/* Crosswalks */}
      {crosswalks.map((cw, i) => (
        <mesh
          key={`cw-${i}`}
          position={[cw.position[0], cw.position[1] || 0.02, cw.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[cw.width, cw.length]} />
          <meshStandardMaterial color={COLORS.CROSSWALK} />
        </mesh>
      ))}
    </group>
  );
});

export default Roads;
