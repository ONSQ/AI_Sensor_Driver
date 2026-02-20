// ============================================================
// SensorManager — orchestrates all sensor engine ticks
// Lives inside <Canvas>. Runs engines in useFrame, writes to store.
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import useEntityStore from '../../stores/useEntityStore.js';
import { LIDAR, THERMAL, AUDIO, CAMERA_CV } from '../../constants/sensors.js';
import { tickLidar } from '../../systems/sensors/lidarEngine.js';
import { tickThermal } from '../../systems/sensors/thermalEngine.js';
import { tickAudio } from '../../systems/sensors/audioEngine.js';
import { tickCamera } from '../../systems/sensors/cameraEngine.js';
import { collectBuildingAABBs } from '../../systems/sensors/sensorTargets.js';

export default function SensorManager({ sensorTargets, collisionData }) {
  const { scene, camera } = useThree();
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

    // --- Merge dynamic entity targets with static targets ---
    const entityList = useEntityStore.getState().entities;
    const dynamicTargets = [];
    for (const e of entityList) {
      if (!e.visible) continue;
      dynamicTargets.push({
        id: e.id + 10000,
        type: e.type,
        sensorClass: e.sensorClass,
        position: e.position,
        bounds: e.bounds,
        thermalTemp: e.thermalTemp,
        soundType: e.soundType,
        soundIntensity: e.soundIntensity,
      });
    }
    const mergedTargets = dynamicTargets.length > 0
      ? { byBlock: sensorTargets.byBlock, global: [...sensorTargets.global, ...dynamicTargets] }
      : sensorTargets;

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
      const result = tickThermal(vehicle, mergedTargets, weather, buildingAABBs);
      sensorState.updateThermal(result);
    }

    // --- Audio: every AUDIO.FRAME_SKIP frames ---
    if (
      sensors.audio.enabled &&
      (frame + AUDIO.STAGGER_OFFSET) % AUDIO.FRAME_SKIP === 0
    ) {
      const result = tickAudio(vehicle, mergedTargets, weather);
      sensorState.updateAudio(result);
    }

    // --- Camera/CV: every CAMERA_CV.FRAME_SKIP frames ---
    if (
      sensors.camera.enabled &&
      (frame + CAMERA_CV.STAGGER_OFFSET) % CAMERA_CV.FRAME_SKIP === 0
    ) {
      const result = tickCamera(
        vehicle,
        mergedTargets,
        timeOfDay,
        weather,
        buildingAABBs,
        sensorState.mainCameraFov,
        camera,
      );
      sensorState.updateCamera(result);
    }
  }); // Normal priority — passing a number stops automatic rendering in R3F.

  // All sensor visualization is done via HTML overlays now
  return null;
}
