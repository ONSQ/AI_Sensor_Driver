// ============================================================
// RearviewMirror — FBO-based rear-view mirror for cockpit
// Renders the main scene from a backward-facing camera into a
// texture, displayed on a rounded-rect plane in the driver's view.
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { VEHICLE_DIMS, MIRROR } from '../../constants/vehicle.js';

/**
 * Build a THREE.Shape for a rounded rectangle centered at origin.
 */
function roundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  // Clamp radius so it doesn't exceed half the smaller dimension
  const cr = Math.min(r, hw, hh);

  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
  shape.lineTo(hw, hh - cr);
  shape.quadraticCurveTo(hw, hh, hw - cr, hh);
  shape.lineTo(-hw + cr, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
  shape.lineTo(-hw, -hh + cr);
  shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);

  return shape;
}

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

  // Pre-build rounded-rect geometries
  const mirrorGeo = useMemo(() => {
    const shape = roundedRectShape(MIRROR.WIDTH, MIRROR.HEIGHT, MIRROR.CORNER_RADIUS);
    const geo = new THREE.ShapeGeometry(shape);

    // Fix UVs: ShapeGeometry uses absolute coords, we need 0–1 range
    // so the FBO texture maps correctly across the full surface.
    const uv = geo.attributes.uv;
    const hw = MIRROR.WIDTH / 2;
    const hh = MIRROR.HEIGHT / 2;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, (uv.getX(i) + hw) / MIRROR.WIDTH);
      uv.setY(i, (uv.getY(i) + hh) / MIRROR.HEIGHT);
    }
    uv.needsUpdate = true;

    return geo;
  }, []);

  const frameGeo = useMemo(() => {
    const pad = MIRROR.FRAME_PADDING;
    const shape = roundedRectShape(
      MIRROR.WIDTH + pad * 2,
      MIRROR.HEIGHT + pad * 2,
      MIRROR.CORNER_RADIUS + pad,
    );
    return new THREE.ShapeGeometry(shape);
  }, []);

  const borderGeo = useMemo(() => {
    const pad = MIRROR.FRAME_PADDING;
    const shape = roundedRectShape(
      MIRROR.WIDTH + pad,
      MIRROR.HEIGHT + pad,
      MIRROR.CORNER_RADIUS + pad * 0.5,
    );
    return new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape));
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

  return (
    <group ref={mirrorGroupRef}>
      {/* Dark frame background (rounded, slightly larger than mirror) */}
      <mesh geometry={frameGeo} position={[0, 0, -0.001]}>
        <meshBasicMaterial color="#0a0a1a" />
      </mesh>

      {/* Mirror surface — horizontally flipped for real mirror effect */}
      <mesh geometry={mirrorGeo} scale={[-1, 1, 1]}>
        <meshBasicMaterial map={fbo.texture} toneMapped={false} />
      </mesh>

      {/* Green border accent (rounded) */}
      <lineSegments geometry={borderGeo}>
        <lineBasicMaterial color={MIRROR.FRAME_COLOR} />
      </lineSegments>
    </group>
  );
}
