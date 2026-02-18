// ============================================================
// Vehicle — Simple 3D car mesh (box body + cabin + wheels)
// Positioned/rotated by useVehicleStore state each frame.
// Visible in orbit mode, hidden in first-person.
// ============================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { VEHICLE_DIMS as D, VEHICLE_COLORS as C } from '../../constants/vehicle.js';

export default function Vehicle({ visible = true }) {
  const groupRef = useRef();
  const wheelFLPivot = useRef();
  const wheelFRPivot = useRef();
  const wheelFLRef = useRef();
  const wheelFRRef = useRef();
  const wheelRLRef = useRef();
  const wheelRRRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;

    const { position, heading, speed, steerAngle } = useVehicleStore.getState();

    // Update group transform
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.rotation.y = heading;

    // Spin wheels based on speed
    const spinAngle = (speed / (2 * Math.PI * D.WHEEL_RADIUS)) * 0.016 * Math.PI * 2;

    // Front wheels steer
    if (wheelFLPivot.current) wheelFLPivot.current.rotation.y = steerAngle;
    if (wheelFRPivot.current) wheelFRPivot.current.rotation.y = steerAngle;
    if (wheelFLRef.current) wheelFLRef.current.rotation.x += spinAngle;
    if (wheelFRRef.current) wheelFRRef.current.rotation.x += spinAngle;

    // Rear wheels just spin
    if (wheelRLRef.current) wheelRLRef.current.rotation.x += spinAngle;
    if (wheelRRRef.current) wheelRRRef.current.rotation.x += spinAngle;
  });

  if (!visible) return null;

  const halfWheelbase = D.WHEELBASE / 2;
  const halfTrack = D.TRACK_WIDTH / 2;
  const bodyY = D.BODY_Y_OFFSET + D.BODY_HEIGHT / 2;
  const cabinY = D.BODY_Y_OFFSET + D.BODY_HEIGHT + D.CABIN_HEIGHT / 2;

  return (
    <group ref={groupRef}>
      {/* Main body box */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[D.BODY_WIDTH, D.BODY_HEIGHT, D.BODY_LENGTH]} />
        <meshStandardMaterial color={C.BODY} />
      </mesh>

      {/* Cabin / windshield */}
      <mesh position={[0, cabinY, D.CABIN_Z_OFFSET]} castShadow>
        <boxGeometry args={[D.CABIN_WIDTH, D.CABIN_HEIGHT, D.CABIN_LENGTH]} />
        <meshStandardMaterial
          color={C.CABIN}
          transparent
          opacity={C.CABIN_OPACITY}
        />
      </mesh>

      {/* Headlights (front face, local -Z = forward) */}
      <mesh position={[-0.5, bodyY, -D.BODY_LENGTH / 2 - 0.01]}>
        <boxGeometry args={[0.3, 0.15, 0.02]} />
        <meshStandardMaterial
          color={C.HEADLIGHT}
          emissive={C.HEADLIGHT}
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0.5, bodyY, -D.BODY_LENGTH / 2 - 0.01]}>
        <boxGeometry args={[0.3, 0.15, 0.02]} />
        <meshStandardMaterial
          color={C.HEADLIGHT}
          emissive={C.HEADLIGHT}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Taillights (rear face, local +Z) */}
      <mesh position={[-0.5, bodyY, D.BODY_LENGTH / 2 + 0.01]}>
        <boxGeometry args={[0.3, 0.15, 0.02]} />
        <meshStandardMaterial
          color={C.TAILLIGHT}
          emissive={C.TAILLIGHT}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0.5, bodyY, D.BODY_LENGTH / 2 + 0.01]}>
        <boxGeometry args={[0.3, 0.15, 0.02]} />
        <meshStandardMaterial
          color={C.TAILLIGHT}
          emissive={C.TAILLIGHT}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Front-left wheel (in steering pivot group) */}
      <group ref={wheelFLPivot} position={[-halfTrack, D.WHEEL_RADIUS, -halfWheelbase]}>
        <mesh ref={wheelFLRef} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[D.WHEEL_RADIUS, D.WHEEL_RADIUS, D.WHEEL_WIDTH, D.WHEEL_SEGMENTS]} />
          <meshStandardMaterial color={C.WHEEL} />
        </mesh>
      </group>

      {/* Front-right wheel (in steering pivot group) */}
      <group ref={wheelFRPivot} position={[halfTrack, D.WHEEL_RADIUS, -halfWheelbase]}>
        <mesh ref={wheelFRRef} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[D.WHEEL_RADIUS, D.WHEEL_RADIUS, D.WHEEL_WIDTH, D.WHEEL_SEGMENTS]} />
          <meshStandardMaterial color={C.WHEEL} />
        </mesh>
      </group>

      {/* Rear-left wheel */}
      <mesh
        ref={wheelRLRef}
        position={[-halfTrack, D.WHEEL_RADIUS, halfWheelbase]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[D.WHEEL_RADIUS, D.WHEEL_RADIUS, D.WHEEL_WIDTH, D.WHEEL_SEGMENTS]} />
        <meshStandardMaterial color={C.WHEEL} />
      </mesh>

      {/* Rear-right wheel */}
      <mesh
        ref={wheelRRRef}
        position={[halfTrack, D.WHEEL_RADIUS, halfWheelbase]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[D.WHEEL_RADIUS, D.WHEEL_RADIUS, D.WHEEL_WIDTH, D.WHEEL_SEGMENTS]} />
        <meshStandardMaterial color={C.WHEEL} />
      </mesh>
    </group>
  );
}
