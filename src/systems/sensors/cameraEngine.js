// ============================================================
// Camera/CV Engine — bounding box detection via projection
//
// tickCamera(vehicle, sensorTargets, timeOfDay, weather, buildingAABBs)
// → { views: { left: [...], center: [...], right: [...], rear: [...] } }
// ============================================================

import * as THREE from 'three';
import { CAMERA_CV } from '../../constants/sensors.js';
import {
  getBlockKeysInRange,
  distanceXZSq,
  bearingToTarget,
  isInFOV,
  hasLineOfSight,
  projectToViewport,
} from './sensorUtils.js';

const EYE_HEIGHT = 1.5;

/**
 * Run one camera/CV tick.
 *
 * @param {{ position: number[], heading: number }} vehicle
 * @param {{ byBlock: object, global: object[] }} sensorTargets
 * @param {string} timeOfDay - 'daylight' | 'dusk' | 'night'
 * @param {string} weather - 'clear' | 'rain' | 'fog'
 * @param {object[]} buildingAABBs
 * @returns {{ views: object }}
 */
export function tickCamera(vehicle, sensorTargets, timeOfDay, weather, buildingAABBs, mainFov, threeCamera) {
  const [vx, , vz] = vehicle.position;
  const { heading } = vehicle;
  const rangeSq = CAMERA_CV.MAX_RANGE * CAMERA_CV.MAX_RANGE;

  // Gather all targets in range
  const blockKeys = getBlockKeysInRange(vx, vz, CAMERA_CV.MAX_RANGE);
  const candidates = [];

  for (const key of blockKeys) {
    const targets = sensorTargets.byBlock[key];
    if (targets) candidates.push(...targets);
  }
  candidates.push(...sensorTargets.global);

  const views = {};

  // Build view list: standard 4 views + dynamic "main" view matching game camera FOV
  const allViews = [
    ...CAMERA_CV.VIEWS,
    { id: 'main', fovDeg: mainFov || 75, headingOffset: 0, label: 'MAIN' },
  ];

  for (const view of allViews) {
    const camHeading = heading + view.headingOffset;
    const halfFOV = (view.fovDeg * Math.PI) / 360;
    const aspect = view.id === 'main' && threeCamera
      ? threeCamera.aspect
      : CAMERA_CV.CANVAS_WIDTH / CAMERA_CV.CANVAS_HEIGHT;
    const fovRad = (view.fovDeg * Math.PI) / 180;
    const camPos = [vx, EYE_HEIGHT, vz];

    const detections = [];

    const cx = camPos[0], cz = camPos[2];

    for (const t of candidates) {
      const [tx, , tz] = t.position;
      const dSq = distanceXZSq(cx, cz, tx, tz);
      if (dSq > rangeSq) continue;

      const dist = Math.sqrt(dSq);

      // Check if target is within this view's FOV
      const bearing = bearingToTarget(cx, cz, camHeading, tx, tz);
      if (!isInFOV(bearing, halfFOV)) continue;

      // Line-of-sight check (camera blocked by walls)
      if (t.type !== 'building') {
        if (!hasLineOfSight(cx, cz, tx, tz, buildingAABBs)) continue;
      }

      let proj, sizeW, sizeH;
      if (view.id === 'main' && threeCamera) {
        const baseVec = new THREE.Vector3(tx, t.position[1], tz);
        // Frustum culling (rough check if behind camera)
        const viewDist = baseVec.distanceTo(threeCamera.position);

        baseVec.project(threeCamera);
        if (baseVec.z > 1.0) continue;

        proj = {
          x: (baseVec.x + 1) / 2,
          y: (-baseVec.y + 1) / 2,
        };

        const topVec = new THREE.Vector3(tx, t.position[1] + t.bounds.h, tz).project(threeCamera);
        const topY = (-topVec.y + 1) / 2;
        sizeH = Math.max(0, proj.y - topY);

        // Approximate width sizing using standard projection math with aspect compensation
        sizeW = Math.min(0.8, (t.bounds.hw * 2) / (viewDist * Math.tan(fovRad / 2) * aspect * 2));
      } else {
        proj = projectToViewport(t.position, camPos, camHeading, fovRad, aspect);
        if (!proj) continue;
        sizeW = Math.min(0.8, (t.bounds.hw * 2) / (dist * Math.tan(fovRad / 2) * aspect * 2));
        sizeH = Math.min(0.8, t.bounds.h / (dist * Math.tan(fovRad / 2) * 2));
      }

      // Confidence computation
      let confidence = CAMERA_CV.BASE_CONFIDENCE + Math.random() * 0.15;
      confidence *= CAMERA_CV.CONFIDENCE_MULTIPLIER[timeOfDay] || 1.0;

      // Weather penalty
      if (weather === 'rain') confidence -= CAMERA_CV.WEATHER_RAIN_PENALTY;
      if (weather === 'fog') confidence -= CAMERA_CV.WEATHER_FOG_PENALTY;

      // Distance penalty (further = lower confidence)
      confidence *= Math.max(0.3, 1 - dist / (CAMERA_CV.MAX_RANGE * 1.2));

      confidence = Math.max(0.05, Math.min(0.99, confidence));

      // Skip if too low confidence to detect
      if (confidence < 0.12) continue;

      // Look up class info
      const classInfo = CAMERA_CV.CLASSES[t.sensorClass];
      if (!classInfo) continue;

      detections.push({
        x: proj.x - sizeW / 2,
        y: proj.y - sizeH,
        w: sizeW,
        h: sizeH,
        class: t.sensorClass,
        confidence,
        label: classInfo.label,
        color: classInfo.color,
        distance: dist,
      });
    }

    // Sort by distance (far first so near draws on top)
    detections.sort((a, b) => b.distance - a.distance);

    views[view.id] = detections;
  }

  return { views };
}
