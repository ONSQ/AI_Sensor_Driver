// ============================================================
// ZoneProps — Renders zone-specific props from prop descriptors
// Construction cones, barriers, school signs, hospital crosses.
// All geometry is raycast-compatible.
// ============================================================

import { memo } from 'react';
import { PROP_DIMS as D, PROP_COLORS as C, SPEED_SIGN_DIMS as SD } from '../../constants/traffic.js';

// --- Individual prop components ---

function TrafficCone({ position }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[D.CONE_BASE_RADIUS * 2, 0.04, D.CONE_BASE_RADIUS * 2]} />
        <meshStandardMaterial color={C.CONE_BASE} />
      </mesh>
      {/* Cone body */}
      <mesh position={[0, D.CONE_HEIGHT / 2 + 0.04, 0]} castShadow>
        <coneGeometry args={[D.CONE_RADIUS, D.CONE_HEIGHT, 8]} />
        <meshStandardMaterial color={C.CONE_ORANGE} />
      </mesh>
    </group>
  );
}

function Barrier({ position, rotation }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Left leg */}
      <mesh position={[-D.BARRIER_WIDTH / 2 + 0.1, D.BARRIER_LEG_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.08, D.BARRIER_LEG_HEIGHT, 0.08]} />
        <meshStandardMaterial color={C.CONE_BASE} />
      </mesh>
      {/* Right leg */}
      <mesh position={[D.BARRIER_WIDTH / 2 - 0.1, D.BARRIER_LEG_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.08, D.BARRIER_LEG_HEIGHT, 0.08]} />
        <meshStandardMaterial color={C.CONE_BASE} />
      </mesh>
      {/* Top bar — orange */}
      <mesh position={[0, D.BARRIER_LEG_HEIGHT + D.BARRIER_HEIGHT / 2 - 0.1, 0]} castShadow>
        <boxGeometry args={[D.BARRIER_WIDTH, D.BARRIER_HEIGHT * 0.4, D.BARRIER_DEPTH]} />
        <meshStandardMaterial color={C.BARRIER_ORANGE} />
      </mesh>
      {/* White stripe */}
      <mesh position={[0, D.BARRIER_LEG_HEIGHT + D.BARRIER_HEIGHT * 0.15, 0]}>
        <boxGeometry args={[D.BARRIER_WIDTH, D.BARRIER_HEIGHT * 0.2, D.BARRIER_DEPTH + 0.005]} />
        <meshStandardMaterial color={C.BARRIER_WHITE} />
      </mesh>
    </group>
  );
}

function SchoolSign({ position, rotation }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pole */}
      <mesh position={[0, D.SIGN_POLE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[D.SIGN_POLE_RADIUS, D.SIGN_POLE_RADIUS, D.SIGN_POLE_HEIGHT, 8]} />
        <meshStandardMaterial color={C.SIGN_POLE} />
      </mesh>
      {/* Diamond sign — rotated 45° square */}
      <mesh
        position={[0, D.SIGN_POLE_HEIGHT + D.SIGN_HEIGHT / 2, 0]}
        rotation={[0, 0, Math.PI / 4]}
        castShadow
      >
        <boxGeometry args={[D.SIGN_WIDTH, D.SIGN_HEIGHT, 0.03]} />
        <meshStandardMaterial color={C.SCHOOL_SIGN} />
      </mesh>
    </group>
  );
}

function HospitalCross({ position, rotation }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pole */}
      <mesh position={[0, D.CROSS_POLE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[D.SIGN_POLE_RADIUS, D.SIGN_POLE_RADIUS, D.CROSS_POLE_HEIGHT, 8]} />
        <meshStandardMaterial color={C.SIGN_POLE} />
      </mesh>
      {/* Horizontal bar of cross */}
      <mesh position={[0, D.CROSS_POLE_HEIGHT + D.CROSS_SIZE / 2, 0]} castShadow>
        <boxGeometry args={[D.CROSS_SIZE, D.CROSS_THICKNESS, D.CROSS_DEPTH]} />
        <meshStandardMaterial
          color={C.HOSPITAL_CROSS}
          emissive={C.HOSPITAL_CROSS}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Vertical bar of cross */}
      <mesh position={[0, D.CROSS_POLE_HEIGHT + D.CROSS_SIZE / 2, 0]}>
        <boxGeometry args={[D.CROSS_THICKNESS, D.CROSS_SIZE, D.CROSS_DEPTH]} />
        <meshStandardMaterial
          color={C.HOSPITAL_CROSS}
          emissive={C.HOSPITAL_CROSS}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function SpeedLimitSign({ position, rotation }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pole */}
      <mesh position={[0, SD.POLE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[SD.POLE_RADIUS, SD.POLE_RADIUS, SD.POLE_HEIGHT, 8]} />
        <meshStandardMaterial color={C.SIGN_POLE} />
      </mesh>
      {/* Sign face — white rectangle with black border (border = slightly larger box behind) */}
      <mesh
        position={[0, SD.POLE_HEIGHT + SD.SIGN_HEIGHT / 2, -0.005]}
        castShadow
      >
        <boxGeometry args={[SD.SIGN_WIDTH + SD.BORDER_WIDTH * 2, SD.SIGN_HEIGHT + SD.BORDER_WIDTH * 2, SD.SIGN_THICKNESS]} />
        <meshStandardMaterial color={C.SPEED_SIGN_BORDER} />
      </mesh>
      {/* White inner face */}
      <mesh
        position={[0, SD.POLE_HEIGHT + SD.SIGN_HEIGHT / 2, 0]}
      >
        <boxGeometry args={[SD.SIGN_WIDTH, SD.SIGN_HEIGHT, SD.SIGN_THICKNESS]} />
        <meshStandardMaterial color={C.SPEED_SIGN_BG} />
      </mesh>
      {/* "SPEED LIMIT" text area — thin dark stripe near top */}
      <mesh
        position={[0, SD.POLE_HEIGHT + SD.SIGN_HEIGHT * 0.85, SD.SIGN_THICKNESS / 2 + 0.002]}
      >
        <planeGeometry args={[SD.SIGN_WIDTH * 0.7, SD.SIGN_HEIGHT * 0.12]} />
        <meshStandardMaterial color={C.SPEED_SIGN_TEXT} />
      </mesh>
      {/* Number area — larger dark square in center */}
      <mesh
        position={[0, SD.POLE_HEIGHT + SD.SIGN_HEIGHT * 0.45, SD.SIGN_THICKNESS / 2 + 0.002]}
      >
        <planeGeometry args={[SD.SIGN_WIDTH * 0.5, SD.SIGN_HEIGHT * 0.4]} />
        <meshStandardMaterial color={C.SPEED_SIGN_TEXT} />
      </mesh>
    </group>
  );
}

// --- Prop type dispatcher ---

const PROP_COMPONENTS = {
  cone: TrafficCone,
  barrier: Barrier,
  school_sign: SchoolSign,
  hospital_cross: HospitalCross,
  speed_sign: SpeedLimitSign,
};

/**
 * Render all props for a single block.
 */
const ZoneProps = memo(function ZoneProps({ props }) {
  if (!props || props.length === 0) return null;

  return (
    <group>
      {props.map((prop, i) => {
        const Component = PROP_COMPONENTS[prop.type];
        if (!Component) return null;
        return <Component key={i} {...prop} />;
      })}
    </group>
  );
});

export default ZoneProps;
