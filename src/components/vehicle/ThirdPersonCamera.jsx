// ============================================================
// ThirdPersonCamera — Chase cam behind and above the vehicle
// Smooth lerp follow for cinematic driving feel.
// ============================================================

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { CAMERA } from '../../constants/vehicle.js';

export default function ThirdPersonCamera() {
  const cameraRef = useRef();
  const targetPos = useRef(null);
  const targetLookAt = useRef(null);

  useEffect(() => {
    targetPos.current = null;
    targetLookAt.current = null;
  }, []);

  useFrame(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    const { position, heading } = useVehicleStore.getState();

    const sinH = Math.sin(heading);
    const cosH = Math.cos(heading);

    // Forward direction: local -Z rotated by heading
    const fwdX = -sinH;
    const fwdZ = -cosH;

    // Camera position: behind the vehicle (opposite of forward) and above
    const camX = position[0] - fwdX * CAMERA.CHASE_DISTANCE;
    const camY = CAMERA.CHASE_HEIGHT;
    const camZ = position[2] - fwdZ * CAMERA.CHASE_DISTANCE;

    // Look-at target: ahead of the vehicle
    const lookX = position[0] + fwdX * CAMERA.CHASE_LOOK_AHEAD;
    const lookY = CAMERA.CHASE_LOOK_HEIGHT;
    const lookZ = position[2] + fwdZ * CAMERA.CHASE_LOOK_AHEAD;

    // Initialize on first frame
    if (!targetPos.current) {
      targetPos.current = [camX, camY, camZ];
      targetLookAt.current = [lookX, lookY, lookZ];
    }

    // Smooth interpolation
    const lerp = CAMERA.CHASE_LERP;

    targetPos.current[0] += (camX - targetPos.current[0]) * lerp;
    targetPos.current[1] += (camY - targetPos.current[1]) * lerp;
    targetPos.current[2] += (camZ - targetPos.current[2]) * lerp;

    targetLookAt.current[0] += (lookX - targetLookAt.current[0]) * lerp;
    targetLookAt.current[1] += (lookY - targetLookAt.current[1]) * lerp;
    targetLookAt.current[2] += (lookZ - targetLookAt.current[2]) * lerp;

    // Apply to camera
    camera.position.set(
      targetPos.current[0],
      targetPos.current[1],
      targetPos.current[2],
    );
    camera.lookAt(
      targetLookAt.current[0],
      targetLookAt.current[1],
      targetLookAt.current[2],
    );

    // Update FOV if needed
    if (camera.fov !== CAMERA.THIRD_PERSON_FOV) {
      camera.fov = CAMERA.THIRD_PERSON_FOV;
      camera.updateProjectionMatrix();
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={CAMERA.THIRD_PERSON_FOV} />;
}
