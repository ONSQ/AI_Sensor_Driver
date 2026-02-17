// ============================================================
// TrafficLight — 3D traffic light with live cycling state
// Pole + housing box + 3 light spheres (red/yellow/green).
// Active light uses emissive material.
// ============================================================

import { memo } from 'react';
import useTrafficStore, { deriveLightState } from '../../stores/useTrafficStore.js';
import { LIGHT_STATE, TRAFFIC_LIGHT_DIMS as D, TRAFFIC_LIGHT_COLORS as C } from '../../constants/traffic.js';

const TrafficLight = memo(function TrafficLight({ position, rotation, axis }) {
  // Subscribe to clock changes to re-render when light state changes
  const clock = useTrafficStore((s) => s.clock);
  const state = deriveLightState(clock, axis);

  const isGreen = state === LIGHT_STATE.GREEN;
  const isYellow = state === LIGHT_STATE.YELLOW;
  const isRed = state === LIGHT_STATE.RED;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pole */}
      <mesh position={[0, D.POLE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[D.POLE_RADIUS, D.POLE_RADIUS, D.POLE_HEIGHT, 8]} />
        <meshStandardMaterial color={C.POLE} />
      </mesh>

      {/* Housing box */}
      <mesh position={[0, D.POLE_HEIGHT + D.HOUSING_HEIGHT / 2, D.HOUSING_DEPTH / 2]} castShadow>
        <boxGeometry args={[D.HOUSING_WIDTH, D.HOUSING_HEIGHT, D.HOUSING_DEPTH]} />
        <meshStandardMaterial color={C.HOUSING} />
      </mesh>

      {/* Red light (top) */}
      <mesh position={[0, D.POLE_HEIGHT + D.HOUSING_HEIGHT - D.LIGHT_SPACING * 0.5, D.HOUSING_DEPTH + 0.01]}>
        <sphereGeometry args={[D.LIGHT_RADIUS, 12, 8]} />
        <meshStandardMaterial
          color={isRed ? C.RED_ON : C.RED_OFF}
          emissive={isRed ? C.RED_ON : '#000000'}
          emissiveIntensity={isRed ? 2 : 0}
        />
      </mesh>

      {/* Yellow light (middle) */}
      <mesh position={[0, D.POLE_HEIGHT + D.HOUSING_HEIGHT / 2 + D.LIGHT_SPACING * 0.15, D.HOUSING_DEPTH + 0.01]}>
        <sphereGeometry args={[D.LIGHT_RADIUS, 12, 8]} />
        <meshStandardMaterial
          color={isYellow ? C.YELLOW_ON : C.YELLOW_OFF}
          emissive={isYellow ? C.YELLOW_ON : '#000000'}
          emissiveIntensity={isYellow ? 2 : 0}
        />
      </mesh>

      {/* Green light (bottom) */}
      <mesh position={[0, D.POLE_HEIGHT + D.LIGHT_SPACING * 0.8, D.HOUSING_DEPTH + 0.01]}>
        <sphereGeometry args={[D.LIGHT_RADIUS, 12, 8]} />
        <meshStandardMaterial
          color={isGreen ? C.GREEN_ON : C.GREEN_OFF}
          emissive={isGreen ? C.GREEN_ON : '#000000'}
          emissiveIntensity={isGreen ? 2 : 0}
        />
      </mesh>
    </group>
  );
});

export default TrafficLight;
