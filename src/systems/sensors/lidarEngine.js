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
 * @returns {{ points: object[], sweepAngle: number, effectiveRange: number }}
 */
export function tickLidar(vehicle, raycaster, scene, settings, weather, prevSweep, delta) {
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

  // Collect scene objects once for raycasting
  // Filter to only include mesh-containing children (skip HUD/helper objects)
  const sceneChildren = scene.children;

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

      const hits = raycaster.intersectObjects(sceneChildren, true);

      if (hits.length > 0) {
        const hit = hits[0];
        let distance = hit.distance;

        // Rain noise: add random jitter to distance
        if (weather === 'rain') {
          distance += (Math.random() - 0.5) * 2 * LIDAR.RAIN_NOISE_METERS;
          distance = Math.max(0.5, distance);
        }

        if (distance <= effectiveRange) {
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
