// ============================================================
// Pedestrian — Simple humanoid mesh (cylinder body + sphere head)
// Positioned/rotated by entity state from useEntityStore.
// ============================================================

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function lightenColor(hex, amount = 0.3) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

const TORSO_W = 0.4;
const TORSO_H = 0.6;
const TORSO_D = 0.2;

const LIMB_W = 0.15;
const LIMB_H = 0.5;
const LIMB_D = 0.15;

const HEAD_R = 0.15;

export default function Pedestrian({ entity }) {
  const headColor = useMemo(() => lightenColor(entity.color, 0.25), [entity.color]);
  const limbColor = useMemo(() => lightenColor(entity.color, 0.1), [entity.color]);

  const groupRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
      groupRef.current.rotation.set(0, entity.heading, 0);
    }

    // Animate limbs if walking
    if (entity.speed > 0) {
      const t = clock.getElapsedTime() * entity.speed * 4; // animation speed based on movement speed
      const swing = Math.sin(t) * 0.5; // angle limit

      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;

      // Arms swing opposite to legs
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing;
    } else {
      // Return to idle stance
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, LIMB_H + TORSO_H + HEAD_R, 0]} castShadow>
        <sphereGeometry args={[HEAD_R, 16, 12]} />
        <meshStandardMaterial color={headColor} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, LIMB_H + TORSO_H / 2, 0]} castShadow>
        <boxGeometry args={[TORSO_W, TORSO_H, TORSO_D]} />
        <meshStandardMaterial color={entity.color} />
      </mesh>

      {/* Left Arm */}
      <group position={[TORSO_W / 2 + LIMB_W / 2, LIMB_H + TORSO_H - 0.1, 0]} ref={leftArmRef}>
        <mesh position={[0, -LIMB_H / 2, 0]} castShadow>
          <boxGeometry args={[LIMB_W, LIMB_H, LIMB_D]} />
          <meshStandardMaterial color={limbColor} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group position={[-TORSO_W / 2 - LIMB_W / 2, LIMB_H + TORSO_H - 0.1, 0]} ref={rightArmRef}>
        <mesh position={[0, -LIMB_H / 2, 0]} castShadow>
          <boxGeometry args={[LIMB_W, LIMB_H, LIMB_D]} />
          <meshStandardMaterial color={limbColor} />
        </mesh>
      </group>

      {/* Left Leg */}
      <group position={[TORSO_W / 4, LIMB_H, 0]} ref={leftLegRef}>
        <mesh position={[0, -LIMB_H / 2, 0]} castShadow>
          <boxGeometry args={[LIMB_W, LIMB_H, LIMB_D]} />
          <meshStandardMaterial color={limbColor} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group position={[-TORSO_W / 4, LIMB_H, 0]} ref={rightLegRef}>
        <mesh position={[0, -LIMB_H / 2, 0]} castShadow>
          <boxGeometry args={[LIMB_W, LIMB_H, LIMB_D]} />
          <meshStandardMaterial color={limbColor} />
        </mesh>
      </group>
    </group>
  );
}
