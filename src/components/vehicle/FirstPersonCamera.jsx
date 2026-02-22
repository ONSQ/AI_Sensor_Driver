// ============================================================
// FirstPersonCamera — Attaches to vehicle at driver eye height
// Smooth lerp interpolation follows vehicle heading.
// ============================================================

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { VEHICLE_DIMS, CAMERA } from '../../constants/vehicle.js';

export default function FirstPersonCamera() {
  const cameraRef = useRef();
  const targetPos = useRef(null);
  const targetLookAt = useRef(null);

  // Clear target position on mount so it snaps directly to the first correct position.
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

    // Driver eye in local space: (-EYE_LEFT, EYE_HEIGHT, -EYE_FORWARD)
    // -X = left side (US left-hand drive), -Z = forward
    const localX = -VEHICLE_DIMS.EYE_LEFT;
    const localZ = -VEHICLE_DIMS.EYE_FORWARD;

    // Rotate local offset by heading (Y-axis rotation matrix)
    const worldOffsetX = localX * cosH + localZ * sinH;
    const worldOffsetZ = -localX * sinH + localZ * cosH;

    const eyeX = position[0] + worldOffsetX;
    const eyeY = VEHICLE_DIMS.EYE_HEIGHT;
    const eyeZ = position[2] + worldOffsetZ;

    // Look-at point: 20m ahead in forward direction
    const lookDist = 20;
    const fwdX = -sinH;
    const fwdZ = -cosH;

    const lookX = eyeX + fwdX * lookDist;
    const lookY = VEHICLE_DIMS.EYE_HEIGHT - 0.3; // slightly below eye level
    const lookZ = eyeZ + fwdZ * lookDist;

    // Initialize on first frame (prevents snap from origin)
    if (!targetPos.current) {
      targetPos.current = [eyeX, eyeY, eyeZ];
      targetLookAt.current = [lookX, lookY, lookZ];
    }

    // Smooth interpolation
    const lerp = CAMERA.LERP_FACTOR;

    targetPos.current[0] += (eyeX - targetPos.current[0]) * lerp;
    targetPos.current[1] += (eyeY - targetPos.current[1]) * lerp;
    targetPos.current[2] += (eyeZ - targetPos.current[2]) * lerp;

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
    if (camera.fov !== CAMERA.FIRST_PERSON_FOV) {
      camera.fov = CAMERA.FIRST_PERSON_FOV;
      camera.updateProjectionMatrix();
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={CAMERA.FIRST_PERSON_FOV} />;
}
