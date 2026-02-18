// ============================================================
// LidarViz — 3D point cloud visualization using THREE.Points
// Reads lidarData from sensor store and updates buffers each frame.
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useSensorStore from '../../stores/useSensorStore.js';
import { LIDAR } from '../../constants/sensors.js';
import { hexToRGB } from '../../systems/sensors/sensorUtils.js';

const MAX_POINTS = LIDAR.RAY_COUNTS[2] * LIDAR.VERTICAL_LAYERS; // 72 * 3 = 216

export default function LidarViz() {
  const pointsRef = useRef();

  // Pre-allocate geometry with max capacity
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_POINTS * 3);
    const colors = new Float32Array(MAX_POINTS * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  useFrame(() => {
    const { points } = useSensorStore.getState().lidarData;
    if (!points || points.length === 0) {
      geometry.setDrawRange(0, 0);
      return;
    }

    const posArr = geometry.attributes.position.array;
    const colArr = geometry.attributes.color.array;
    const count = Math.min(points.length, MAX_POINTS);

    for (let i = 0; i < count; i++) {
      const p = points[i];
      posArr[i * 3] = p.x;
      posArr[i * 3 + 1] = p.y;
      posArr[i * 3 + 2] = p.z;

      const c = hexToRGB(p.color);
      colArr[i * 3] = c.r;
      colArr[i * 3 + 1] = c.g;
      colArr[i * 3 + 2] = c.b;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.setDrawRange(0, count);
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={LIDAR.POINT_SIZE}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  );
}
