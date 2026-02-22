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

const WHEEL_RAD = 0.35;
const WHEEL_W = 0.2;
const WHEEL_X_OFFSET = BODY_WIDTH / 2 + 0.05;
const WHEEL_Z_OFFSET = BODY_LENGTH / 2 - 0.6;

function darkenColor(hex, amount = 0.2) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, -amount);
  return `#${c.getHexString()}`;
}

const geoBox = new THREE.BoxGeometry(1, 1, 1);
const geoWheel = new THREE.CylinderGeometry(WHEEL_RAD, WHEEL_RAD, WHEEL_W, 16);
const matWheel = new THREE.MeshStandardMaterial({ color: '#111' });

export default function NpcVehicle({ entity }) {
  const cabinColor = useMemo(() => darkenColor(entity.color, 0.2), [entity.color]);

  const bodyY = BODY_Y_OFFSET + BODY_HEIGHT / 2;
  const cabinY = BODY_Y_OFFSET + BODY_HEIGHT + CABIN_HEIGHT / 2;

  const groupRef = useRef();

  // Only moving vehicles have headlights on
  const isMoving = entity.subtype !== 'parked' && entity.speed > 0;
  const headlightsOn = isMoving;
  // If moving but speed is 0, brakelights on (or always on if we don't have brake state, just dim red for tails)
  const brakeOn = entity.subtype !== 'parked' && entity.speed < 1;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
      groupRef.current.rotation.set(0, entity.heading + Math.PI, 0);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow geometry={geoBox}>
        <meshStandardMaterial color={entity.color} />
        <boxGeometry args={[BODY_WIDTH, BODY_HEIGHT, BODY_LENGTH]} />
      </mesh>

      {/* Cabin / windshield area */}
      <mesh position={[0, cabinY, CABIN_Z_OFFSET]} castShadow geometry={geoBox}>
        <meshStandardMaterial color={cabinColor} transparent opacity={0.7} roughness={0.1} />
        <boxGeometry args={[CABIN_WIDTH, CABIN_HEIGHT, CABIN_LENGTH]} />
      </mesh>

      {/* Wheels */}
      <mesh position={[WHEEL_X_OFFSET, WHEEL_RAD, WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} geometry={geoWheel} material={matWheel} castShadow />
      <mesh position={[-WHEEL_X_OFFSET, WHEEL_RAD, WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} geometry={geoWheel} material={matWheel} castShadow />
      <mesh position={[WHEEL_X_OFFSET, WHEEL_RAD, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} geometry={geoWheel} material={matWheel} castShadow />
      <mesh position={[-WHEEL_X_OFFSET, WHEEL_RAD, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} geometry={geoWheel} material={matWheel} castShadow />

      {/* Headlights */}
      <mesh position={[BODY_WIDTH / 2 - 0.3, bodyY, BODY_LENGTH / 2 + 0.01]}>
        <boxGeometry args={[0.3, 0.2, 0.05]} />
        <meshStandardMaterial color={headlightsOn ? '#ffffee' : '#333'} emissive={headlightsOn ? '#ffffee' : '#000'} emissiveIntensity={2} />
      </mesh>
      <mesh position={[-BODY_WIDTH / 2 + 0.3, bodyY, BODY_LENGTH / 2 + 0.01]}>
        <boxGeometry args={[0.3, 0.2, 0.05]} />
        <meshStandardMaterial color={headlightsOn ? '#ffffee' : '#333'} emissive={headlightsOn ? '#ffffee' : '#000'} emissiveIntensity={2} />
      </mesh>

      {/* Taillights */}
      <mesh position={[BODY_WIDTH / 2 - 0.3, bodyY, -BODY_LENGTH / 2 - 0.01]}>
        <boxGeometry args={[0.3, 0.2, 0.05]} />
        <meshStandardMaterial color={brakeOn ? '#ff0000' : '#550000'} emissive={brakeOn ? '#ff0000' : '#220000'} emissiveIntensity={brakeOn ? 2 : 0.5} />
      </mesh>
      <mesh position={[-BODY_WIDTH / 2 + 0.3, bodyY, -BODY_LENGTH / 2 - 0.01]}>
        <boxGeometry args={[0.3, 0.2, 0.05]} />
        <meshStandardMaterial color={brakeOn ? '#ff0000' : '#550000'} emissive={brakeOn ? '#ff0000' : '#220000'} emissiveIntensity={brakeOn ? 2 : 0.5} />
      </mesh>
    </group>
  );
}
