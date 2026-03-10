// ============================================================
// LiDAR Engine — raycasting against real scene geometry
//
// tickLidar(vehicle, raycaster, scene, settings, weather, prevSweep, delta)
// → { points, sweepAngle, effectiveRange }
// ============================================================

import * as THREE from 'three';
import { LIDAR } from '../../constants/sensors.js';
import { distanceToLidarColor } from './sensorUtils.js';

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();

function isDescendantOf(obj, ancestor) {
  let current = obj.parent;
  while (current != null) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Run one LiDAR tick.
 *
 * @param {{ position: number[], heading: number }} vehicle
 * @param {THREE.Raycaster} raycaster
 * @param {THREE.Scene} scene
 * @param {{ rayCount: number }} settings
 * @param {string} weather - 'clear' | 'rain' | 'fog'
 * @param {number} prevSweep - previous sweep angle (radians)
 * @param {number} delta - frame delta (seconds)
 * @param {THREE.Object3D | THREE.Object3D[]} [excludeFromLidar] - object(s) to exclude (e.g. player vehicle)
 * @returns {{ points: object[], sweepAngle: number, effectiveRange: number }}
 */
export function tickLidar(vehicle, raycaster, scene, settings, weather, prevSweep, delta, excludeFromLidar) {
  const { position, heading } = vehicle;
  const [vx, , vz] = position;
  const eyeY = 1.5; // vehicle eye height

  // Effective range based on weather
  let effectiveRange = LIDAR.MAX_RANGE;
  if (weather === 'fog') effectiveRange *= LIDAR.FOG_RANGE_FACTOR;
  raycaster.far = effectiveRange;
  raycaster.near = 0.5;

  // Advance sweep animation
  const sweepAngle = prevSweep + LIDAR.SWEEP_SPEED * Math.PI * 2 * delta;

  const rayCount = settings.rayCount;
  const angleStep = (Math.PI * 2) / rayCount;
  const points = [];

  // Build raycast targets: all meshes in scene except the excluded object(s) and their descendants
  const excludeList = excludeFromLidar ? (Array.isArray(excludeFromLidar) ? excludeFromLidar : [excludeFromLidar]) : [];
  const isExcluded = (obj) => excludeList.some((ex) => obj === ex || isDescendantOf(obj, ex));
  const targets = [];
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData && obj.userData.isGround) return; // skip ground plane (avoids ring of points around car)
    if (isExcluded(obj)) return;
    targets.push(obj);
  });

  for (let i = 0; i < rayCount; i++) {
    const rayAngle = heading + i * angleStep + sweepAngle;

    for (let layer = 0; layer < LIDAR.VERTICAL_LAYERS; layer++) {
      const vertAngle = LIDAR.VERTICAL_ANGLES[layer] * (Math.PI / 180);

      // Set ray origin at vehicle eye height
      _origin.set(vx, eyeY, vz);

      // Direction from heading + ray angle + vertical angle
      const cosV = Math.cos(vertAngle);
      _direction.set(
        -Math.sin(rayAngle) * cosV,
        Math.sin(vertAngle),
        -Math.cos(rayAngle) * cosV,
      );
      _direction.normalize();

      raycaster.set(_origin, _direction);

      const hits = raycaster.intersectObjects(targets, false);

      if (hits.length > 0) {
        const hit = hits[0];
        let distance = hit.distance;

        // Rain noise: add random jitter to distance
        if (weather === 'rain') {
          distance += (Math.random() - 0.5) * 2 * LIDAR.RAIN_NOISE_METERS;
          distance = Math.max(0.5, distance);
        }

        if (distance <= effectiveRange) {
          // Skip ground-level hits (road, sidewalk, ground plane) to avoid ring of points around car
          if (hit.point.y < 0.4) continue;
          const color = distanceToLidarColor(distance);
          points.push({
            x: hit.point.x,
            y: hit.point.y,
            z: hit.point.z,
            distance,
            color,
          });
        }
      }
    }
  }

  return { points, sweepAngle, effectiveRange };
}
