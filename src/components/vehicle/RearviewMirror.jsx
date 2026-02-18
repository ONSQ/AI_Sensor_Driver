// ============================================================
// RearviewMirror — FBO-based rear-view mirror for cockpit
// Renders the main scene from a backward-facing camera into a
// texture, displayed on a plane fixed in the driver's view.
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { VEHICLE_DIMS, MIRROR } from '../../constants/vehicle.js';

export default function RearviewMirror({ enabled = true }) {
  const { gl, scene, camera: mainCamera } = useThree();

  // FBO render target for mirror texture
  const fbo = useFBO(MIRROR.FBO_WIDTH, MIRROR.FBO_HEIGHT, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
  });

  // Rear-facing camera (reused across frames)
  const rearCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(
      MIRROR.FOV,
      MIRROR.FBO_WIDTH / MIRROR.FBO_HEIGHT,
      0.5,
      400,
    );
    return cam;
  }, []);

  const mirrorGroupRef = useRef();
  const frameCount = useRef(0);

  // Reusable THREE objects (avoids GC churn)
  const _camPos = useMemo(() => new THREE.Vector3(), []);
  const _camQuat = useMemo(() => new THREE.Quaternion(), []);
  const _offset = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!enabled || !mirrorGroupRef.current) return;

    // ---- Position mirror group in camera-local space every frame ----
    mainCamera.getWorldPosition(_camPos);
    mainCamera.getWorldQuaternion(_camQuat);

    // Local offset: right, up, forward (camera -Z = forward)
    _offset.set(MIRROR.OFFSET_X, MIRROR.OFFSET_Y, MIRROR.OFFSET_Z);
    _offset.applyQuaternion(_camQuat);

    mirrorGroupRef.current.position.copy(_camPos).add(_offset);
    mirrorGroupRef.current.quaternion.copy(_camQuat);

    // ---- Render rear view into FBO (frame-skipped) ----
    frameCount.current += 1;
    if (frameCount.current % MIRROR.FRAME_SKIP !== 0) return;

    const { position, heading } = useVehicleStore.getState();

    // Backward direction (opposite of forward vector [-sinH, 0, -cosH])
    const sinH = Math.sin(heading);
    const cosH = Math.cos(heading);
    const backX = sinH;
    const backZ = cosH;

    // Position rear camera at driver eye
    const localX = -VEHICLE_DIMS.EYE_LEFT;
    const localZ = -VEHICLE_DIMS.EYE_FORWARD;
    const worldOffsetX = localX * cosH + localZ * sinH;
    const worldOffsetZ = -localX * sinH + localZ * cosH;

    const eyeX = position[0] + worldOffsetX;
    const eyeY = VEHICLE_DIMS.EYE_HEIGHT;
    const eyeZ = position[2] + worldOffsetZ;

    rearCamera.position.set(eyeX, eyeY, eyeZ);

    // Look backward
    rearCamera.lookAt(
      eyeX + backX * 20,
      eyeY - 0.2,
      eyeZ + backZ * 20,
    );
    rearCamera.updateMatrixWorld();

    // Render scene from rear camera into FBO
    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.render(scene, rearCamera);
    gl.setRenderTarget(prevTarget);
  });

  if (!enabled) return null;

  const pad = MIRROR.FRAME_PADDING;

  return (
    <group ref={mirrorGroupRef}>
      {/* Dark frame background (slightly larger than mirror) */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[MIRROR.WIDTH + pad * 2, MIRROR.HEIGHT + pad * 2]} />
        <meshBasicMaterial color="#0a0a1a" />
      </mesh>

      {/* Mirror surface — horizontally flipped for real mirror effect */}
      <mesh scale={[-1, 1, 1]}>
        <planeGeometry args={[MIRROR.WIDTH, MIRROR.HEIGHT]} />
        <meshBasicMaterial map={fbo.texture} toneMapped={false} />
      </mesh>

      {/* Green border accent */}
      <lineSegments>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(
            MIRROR.WIDTH + pad,
            MIRROR.HEIGHT + pad,
          )]}
        />
        <lineBasicMaterial color={MIRROR.FRAME_COLOR} />
      </lineSegments>
    </group>
  );
}
