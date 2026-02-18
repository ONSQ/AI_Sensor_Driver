// ============================================================
// WaypointMarker — 3D glowing pillar at each waypoint
// Active waypoint pulses green, future waypoints are dim,
// reached waypoints are hidden.
// ============================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Single waypoint marker — a translucent pillar with a floating diamond.
 *
 * @param {object} props
 * @param {number[]} props.position - [x, y, z] world position
 * @param {boolean} props.active - true if this is the current target
 * @param {boolean} props.reached - true if already collected
 * @param {number} props.index - waypoint index for label
 */
export default function WaypointMarker({ position, active, reached, index }) {
  const pillarRef = useRef();
  const diamondRef = useRef();

  // Animate active marker: pulse opacity and diamond bob
  useFrame((_, delta) => {
    if (!active) return;

    // Pulse pillar opacity between 0.15 and 0.45
    if (pillarRef.current) {
      const mat = pillarRef.current.material;
      mat.opacity += delta * (mat._dir || 1) * 0.6;
      if (mat.opacity > 0.45) { mat.opacity = 0.45; mat._dir = -1; }
      if (mat.opacity < 0.15) { mat.opacity = 0.15; mat._dir = 1; }
    }

    // Bob diamond up and down
    if (diamondRef.current) {
      diamondRef.current.rotation.y += delta * 1.5;
      diamondRef.current.position.y = 3 + Math.sin(Date.now() * 0.003) * 0.5;
    }
  });

  // Don't render reached waypoints
  if (reached) return null;

  const pillarHeight = active ? 20 : 10;
  const pillarRadius = active ? 0.5 : 0.3;
  const color = active ? '#00ff88' : '#666688';
  const opacity = active ? 0.3 : 0.1;

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Translucent pillar */}
      <mesh
        ref={pillarRef}
        position={[0, pillarHeight / 2, 0]}
      >
        <cylinderGeometry args={[pillarRadius, pillarRadius, pillarHeight, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[pillarRadius + 0.3, pillarRadius + 0.8, 32]} />
        <meshBasicMaterial
          color={active ? '#00ff88' : '#444466'}
          transparent
          opacity={active ? 0.5 : 0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Floating diamond (active only) */}
      {active && (
        <mesh ref={diamondRef} position={[0, 3, 0]}>
          <octahedronGeometry args={[0.6, 0]} />
          <meshBasicMaterial
            color="#00ff88"
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Waypoint number label — small sphere with number */}
      {!active && (
        <mesh position={[0, 2, 0]}>
          <octahedronGeometry args={[0.35, 0]} />
          <meshBasicMaterial
            color="#666688"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}
