// ============================================================
// StopSign — 3D stop sign: pole + octagonal face
// ============================================================

import { memo } from 'react';
import { STOP_SIGN_DIMS as D, STOP_SIGN_COLORS as C } from '../../constants/traffic.js';

const StopSign = memo(function StopSign({ position, rotation }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pole */}
      <mesh position={[0, D.POLE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[D.POLE_RADIUS, D.POLE_RADIUS, D.POLE_HEIGHT, 8]} />
        <meshStandardMaterial color={C.POLE} />
      </mesh>

      {/* Octagonal sign face — cylinder with 8 radial segments, very thin */}
      <mesh
        position={[0, D.POLE_HEIGHT + D.SIGN_RADIUS * 0.8, 0]}
        rotation={[Math.PI / 2, Math.PI / 8, 0]}
        castShadow
      >
        <cylinderGeometry args={[D.SIGN_RADIUS, D.SIGN_RADIUS, D.SIGN_THICKNESS, 8]} />
        <meshStandardMaterial color={C.SIGN_FACE} />
      </mesh>

      {/* White border ring — slightly larger, behind */}
      <mesh
        position={[0, D.POLE_HEIGHT + D.SIGN_RADIUS * 0.8, -0.005]}
        rotation={[Math.PI / 2, Math.PI / 8, 0]}
      >
        <cylinderGeometry args={[D.SIGN_RADIUS + 0.05, D.SIGN_RADIUS + 0.05, D.SIGN_THICKNESS + 0.01, 8]} />
        <meshStandardMaterial color={C.SIGN_BORDER} />
      </mesh>
    </group>
  );
});

export default StopSign;
