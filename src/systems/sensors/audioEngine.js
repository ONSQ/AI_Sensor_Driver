// ============================================================
// Audio Engine — spatial audio source computation
//
// tickAudio(vehicle, sensorTargets, weather)
// → { sources, noiseFloor }
// ============================================================

import { AUDIO } from '../../constants/sensors.js';
import {
  getBlockKeysInRange,
  distanceXZSq,
  bearingToTarget,
} from './sensorUtils.js';

/**
 * Run one audio tick.
 * Audio does NOT require line-of-sight (sound goes around corners).
 *
 * @param {{ position: number[], heading: number, speed: number }} vehicle
 * @param {{ byBlock: object, global: object[] }} sensorTargets
 * @param {string} weather
 * @returns {{ sources: object[], noiseFloor: number }}
 */
export function tickAudio(vehicle, sensorTargets, weather) {
  const [vx, , vz] = vehicle.position;
  const { heading, speed } = vehicle;
  const rangeSq = AUDIO.RANGE * AUDIO.RANGE;

  // Noise floor
  let noiseFloor = AUDIO.BASE_NOISE_FLOOR;
  if (weather === 'rain') noiseFloor += AUDIO.RAIN_NOISE_FLOOR;

  // Gather sound-emitting targets
  const blockKeys = getBlockKeysInRange(vx, vz, AUDIO.RANGE);
  const candidates = [];

  for (const key of blockKeys) {
    const targets = sensorTargets.byBlock[key];
    if (targets) {
      for (const t of targets) {
        if (t.soundType && t.soundIntensity > 0) candidates.push(t);
      }
    }
  }
  // Global targets
  for (const t of sensorTargets.global) {
    if (t.soundType && t.soundIntensity > 0) candidates.push(t);
  }

  const sources = [];

  for (const t of candidates) {
    const [tx, , tz] = t.position;
    const dSq = distanceXZSq(vx, vz, tx, tz);

    if (dSq > rangeSq) continue;

    const dist = Math.sqrt(dSq);
    const bearing = bearingToTarget(vx, vz, heading, tx, tz);

    // Intensity: base * inverse distance falloff
    const intensity = t.soundIntensity / (1 + dist * AUDIO.DISTANCE_FALLOFF);

    // Skip if below noise floor
    if (intensity < noiseFloor) continue;

    // Doppler shift (simplified): approaching = higher pitch
    const relativeVelocity = speed * Math.cos(bearing);
    const dopplerShift = 1 + relativeVelocity * 0.01;

    const soundMeta = AUDIO.SOUND_TYPES[t.soundType];
    if (!soundMeta) continue;

    sources.push({
      bearing,
      distance: dist,
      type: t.soundType,
      intensity,
      label: soundMeta.label,
      color: soundMeta.color,
      freq: soundMeta.freq,
      dopplerShift,
    });
  }

  // Sort by intensity (loudest first)
  sources.sort((a, b) => b.intensity - a.intensity);

  return { sources, noiseFloor };
}
