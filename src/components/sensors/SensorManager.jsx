// ============================================================
// SensorManager — orchestrates all sensor engine ticks
// Lives inside <Canvas>. Runs engines in useFrame, writes to store.
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { LIDAR, THERMAL, AUDIO, CAMERA_CV } from '../../constants/sensors.js';
import { tickLidar } from '../../systems/sensors/lidarEngine.js';
import { tickThermal } from '../../systems/sensors/thermalEngine.js';
import { tickAudio } from '../../systems/sensors/audioEngine.js';
import { tickCamera } from '../../systems/sensors/cameraEngine.js';
import { collectBuildingAABBs } from '../../systems/sensors/sensorTargets.js';
import LidarViz from './LidarViz.jsx';

export default function SensorManager({ sensorTargets, collisionData }) {
  const { scene } = useThree();
  const frameCount = useRef(0);
  const sweepAngle = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Pre-collect building AABBs for LOS checks (thermal + camera)
  const buildingAABBs = useMemo(
    () => collectBuildingAABBs(sensorTargets),
    [sensorTargets],
  );

  useFrame((_, delta) => {
    frameCount.current++;
    const frame = frameCount.current;
    const vehicle = useVehicleStore.getState();
    const sensorState = useSensorStore.getState();
    const { weather, timeOfDay, sensors } = sensorState;

    // --- LiDAR: every LIDAR.FRAME_SKIP frames ---
    if (
      sensors.lidar.enabled &&
      (frame + LIDAR.STAGGER_OFFSET) % LIDAR.FRAME_SKIP === 0
    ) {
      const result = tickLidar(
        vehicle,
        raycaster,
        scene,
        sensors.lidar,
        weather,
        sweepAngle.current,
        delta * LIDAR.FRAME_SKIP, // scale delta by skip factor
      );
      sweepAngle.current = result.sweepAngle;
      sensorState.updateLidar(result);
    }

    // --- Thermal: every THERMAL.FRAME_SKIP frames ---
    if (
      sensors.thermal.enabled &&
      (frame + THERMAL.STAGGER_OFFSET) % THERMAL.FRAME_SKIP === 0
    ) {
      const result = tickThermal(vehicle, sensorTargets, weather, buildingAABBs);
      sensorState.updateThermal(result);
    }

    // --- Audio: every AUDIO.FRAME_SKIP frames ---
    if (
      sensors.audio.enabled &&
      (frame + AUDIO.STAGGER_OFFSET) % AUDIO.FRAME_SKIP === 0
    ) {
      const result = tickAudio(vehicle, sensorTargets, weather);
      sensorState.updateAudio(result);
    }

    // --- Camera/CV: every CAMERA_CV.FRAME_SKIP frames ---
    if (
      sensors.camera.enabled &&
      (frame + CAMERA_CV.STAGGER_OFFSET) % CAMERA_CV.FRAME_SKIP === 0
    ) {
      const result = tickCamera(
        vehicle,
        sensorTargets,
        timeOfDay,
        weather,
        buildingAABBs,
      );
      sensorState.updateCamera(result);
    }
  });

  // Only LiDAR renders in 3D scene; other sensors use HTML overlays
  const lidarEnabled = useSensorStore((s) => s.sensors.lidar.enabled);

  return <>{lidarEnabled && <LidarViz />}</>;
}
