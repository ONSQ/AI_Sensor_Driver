// ============================================================
// EmergencyVehicle — Ambulance-style mesh with flashing lights
// White body, red cross on front, alternating red/blue roof lights.
// ============================================================

// Dimensions (slightly larger than NpcVehicle)
const BODY_LENGTH = 4.5; // Z
const BODY_HEIGHT = 1.3; // Y
const BODY_WIDTH = 1.8; // X
const CABIN_LENGTH = 2.2; // Z
const CABIN_HEIGHT = 0.9; // Y
const CABIN_WIDTH = 1.7; // X
const BODY_Y_OFFSET = 0.35;
const CABIN_Z_OFFSET = -0.3;

const BODY_COLOR = '#eeeeee';
const CABIN_COLOR = '#cccccc';
const CROSS_COLOR = '#cc0000';

const LIGHT_RADIUS = 0.12;
const LIGHT_X_OFFSET = 0.3;
const LIGHT_Y_ABOVE_CABIN = 0.15;

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function EmergencyVehicle({ entity }) {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
      groupRef.current.rotation.set(0, entity.heading, 0);
    }
  });
  const bodyY = BODY_Y_OFFSET + BODY_HEIGHT / 2; // 1.0
  const cabinY = BODY_Y_OFFSET + BODY_HEIGHT + CABIN_HEIGHT / 2; // 2.1
  const cabinTop = BODY_Y_OFFSET + BODY_HEIGHT + CABIN_HEIGHT; // 2.55
  const lightY = cabinTop + LIGHT_Y_ABOVE_CABIN; // 2.7

  // Alternate red/blue based on flashState
  const leftEmissive = entity.flashState ? '#ff0000' : '#0044ff';
  const rightEmissive = entity.flashState ? '#0044ff' : '#ff0000';
  const emissiveIntensity = 2.0;

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[BODY_WIDTH, BODY_HEIGHT, BODY_LENGTH]} />
        <meshStandardMaterial color={BODY_COLOR} />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, cabinY, CABIN_Z_OFFSET]} castShadow>
        <boxGeometry args={[CABIN_WIDTH, CABIN_HEIGHT, CABIN_LENGTH]} />
        <meshStandardMaterial
          color={CABIN_COLOR}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Red cross on front face (local -Z = forward) */}
      {/* Horizontal bar */}
      <mesh position={[0, bodyY, -BODY_LENGTH / 2 - 0.01]}>
        <boxGeometry args={[0.6, 0.15, 0.02]} />
        <meshStandardMaterial color={CROSS_COLOR} />
      </mesh>
      {/* Vertical bar */}
      <mesh position={[0, bodyY, -BODY_LENGTH / 2 - 0.01]}>
        <boxGeometry args={[0.15, 0.6, 0.02]} />
        <meshStandardMaterial color={CROSS_COLOR} />
      </mesh>

      {/* Left roof light */}
      <mesh position={[-LIGHT_X_OFFSET, lightY, CABIN_Z_OFFSET]}>
        <sphereGeometry args={[LIGHT_RADIUS, 8, 6]} />
        <meshStandardMaterial
          color={leftEmissive}
          emissive={leftEmissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Right roof light */}
      <mesh position={[LIGHT_X_OFFSET, lightY, CABIN_Z_OFFSET]}>
        <sphereGeometry args={[LIGHT_RADIUS, 8, 6]} />
        <meshStandardMaterial
          color={rightEmissive}
          emissive={rightEmissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </group>
  );
}
