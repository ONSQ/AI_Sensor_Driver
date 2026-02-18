// ============================================================
// Thermal IR Engine — overhead heatmap blob computation
//
// tickThermal(vehicle, sensorTargets, weather, buildingAABBs)
// → { blobs: [{relX, relZ, temp, radius, type}] }
// ============================================================

import { THERMAL } from '../../constants/sensors.js';
import {
  getBlockKeysInRange,
  distanceXZSq,
  hasLineOfSight,
} from './sensorUtils.js';

/**
 * Run one thermal tick.
 *
 * @param {{ position: number[], heading: number }} vehicle
 * @param {{ byBlock: object, global: object[] }} sensorTargets
 * @param {string} weather
 * @param {object[]} buildingAABBs - flat array for LOS checks
 * @returns {{ blobs: object[] }}
 */
export function tickThermal(vehicle, sensorTargets, weather, buildingAABBs) {
  const [vx, , vz] = vehicle.position;
  const rangeSq = THERMAL.RANGE * THERMAL.RANGE;
  const blobs = [];

  // Weather multiplier
  let weatherMul = 1.0;
  if (weather === 'fog') weatherMul = THERMAL.FOG_DEGRADATION;
  if (weather === 'rain') weatherMul = THERMAL.RAIN_DEGRADATION;

  // Gather targets from nearby blocks
  const blockKeys = getBlockKeysInRange(vx, vz, THERMAL.RANGE);
  const candidates = [];

  for (const key of blockKeys) {
    const targets = sensorTargets.byBlock[key];
    if (targets) candidates.push(...targets);
  }
  // Add global targets (traffic lights, stop signs)
  candidates.push(...sensorTargets.global);

  for (const t of candidates) {
    const [tx, , tz] = t.position;
    const dSq = distanceXZSq(vx, vz, tx, tz);

    if (dSq > rangeSq) continue;

    // Buildings always visible (they ARE the environment)
    // Other objects need line-of-sight (thermal blocked by walls)
    if (t.type !== 'building') {
      if (!hasLineOfSight(vx, vz, tx, tz, buildingAABBs)) continue;
    }

    const dist = Math.sqrt(dSq);

    // Temperature with distance falloff + weather
    let temp = t.thermalTemp;
    temp *= Math.max(0.1, 1 - dist * THERMAL.INTENSITY_FALLOFF);
    temp *= weatherMul;

    // Relative position (vehicle at center)
    const relX = tx - vx;
    const relZ = tz - vz;

    // Radius based on object bounds
    const radius = Math.max(t.bounds.hw, t.bounds.hd, 0.5);

    blobs.push({
      relX,
      relZ,
      temp: t.thermalTemp,    // original temp for color lookup
      displayTemp: temp,       // degraded temp for intensity
      radius,
      type: t.type,
    });
  }

  return { blobs };
}
