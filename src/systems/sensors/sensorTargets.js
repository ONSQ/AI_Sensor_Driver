// ============================================================
// Sensor Target Database — pre-process worldData into
// sensor-friendly target descriptors with spatial indexing.
//
// buildSensorTargets(worldData) → { byBlock, global }
// ============================================================

import { PROP_DIMS } from '../../constants/traffic.js';
import { THERMAL, AUDIO } from '../../constants/sensors.js';
import { ZONE_MAP } from '../../constants/world.js';

/**
 * Build sensor target database from world generation output.
 * Each target has: id, type, sensorClass, position, bounds, thermalTemp, soundType, soundIntensity.
 */
export function buildSensorTargets(worldData) {
  const byBlock = {};
  const global = [];
  let nextId = 0;

  for (const block of worldData.blocks) {
    const key = `${block.row},${block.col}`;
    const targets = [];
    const zone = ZONE_MAP[block.row]?.[block.col] || 'city';

    // --- Buildings ---
    for (const b of block.buildings) {
      targets.push({
        id: nextId++,
        type: 'building',
        sensorClass: 'building',
        position: [...b.position],
        bounds: {
          hw: b.width / 2,
          hd: b.depth / 2,
          h: b.height,
        },
        // AABB for LOS checks
        minX: b.position[0] - b.width / 2,
        maxX: b.position[0] + b.width / 2,
        minZ: b.position[2] - b.depth / 2,
        maxZ: b.position[2] + b.depth / 2,
        thermalTemp: THERMAL.SIGNATURES.building,
        soundType: null,
        soundIntensity: 0,
      });
    }

    // --- Props ---
    for (const p of block.props) {
      const [px, py, pz] = p.position;

      if (p.type === 'cone') {
        targets.push({
          id: nextId++,
          type: 'cone',
          sensorClass: 'cone',
          position: [px, py, pz],
          bounds: { hw: PROP_DIMS.CONE_BASE_RADIUS, hd: PROP_DIMS.CONE_BASE_RADIUS, h: PROP_DIMS.CONE_HEIGHT },
          thermalTemp: THERMAL.SIGNATURES.cone,
          soundType: zone === 'construction' ? 'construction' : null,
          soundIntensity: zone === 'construction' ? 0.4 : 0,
        });
      } else if (p.type === 'barrier') {
        targets.push({
          id: nextId++,
          type: 'barrier',
          sensorClass: 'barrier',
          position: [px, py, pz],
          bounds: { hw: PROP_DIMS.BARRIER_WIDTH / 2, hd: PROP_DIMS.BARRIER_DEPTH / 2, h: PROP_DIMS.BARRIER_HEIGHT },
          thermalTemp: THERMAL.SIGNATURES.barrier,
          soundType: zone === 'construction' ? 'construction' : null,
          soundIntensity: zone === 'construction' ? 0.6 : 0,
        });
      } else if (p.type === 'school_sign') {
        targets.push({
          id: nextId++,
          type: 'school_sign',
          sensorClass: 'sign',
          position: [px, py, pz],
          bounds: { hw: PROP_DIMS.SIGN_WIDTH / 2, hd: PROP_DIMS.SIGN_WIDTH / 2, h: PROP_DIMS.SIGN_POLE_HEIGHT },
          thermalTemp: THERMAL.SIGNATURES.school_sign,
          soundType: null,
          soundIntensity: 0,
        });
      } else if (p.type === 'hospital_cross') {
        targets.push({
          id: nextId++,
          type: 'hospital_cross',
          sensorClass: 'hospital_cross',
          position: [px, py, pz],
          bounds: { hw: PROP_DIMS.CROSS_SIZE / 2, hd: PROP_DIMS.CROSS_SIZE / 2, h: PROP_DIMS.CROSS_POLE_HEIGHT },
          thermalTemp: THERMAL.SIGNATURES.hospital_cross,
          soundType: 'ambient',
          soundIntensity: 0.2,
        });
      } else if (p.type === 'speed_sign') {
        targets.push({
          id: nextId++,
          type: 'speed_sign',
          sensorClass: 'sign',
          position: [px, py, pz],
          bounds: { hw: PROP_DIMS.SIGN_WIDTH / 2, hd: PROP_DIMS.SIGN_WIDTH / 2, h: PROP_DIMS.SIGN_POLE_HEIGHT },
          thermalTemp: THERMAL.SIGNATURES.speed_sign,
          soundType: null,
          soundIntensity: 0,
        });
      }
    }

    byBlock[key] = targets;
  }

  // --- Traffic lights (global — on roads, not in blocks) ---
  if (worldData.trafficLights) {
    for (const tl of worldData.trafficLights) {
      global.push({
        id: nextId++,
        type: 'traffic_light',
        sensorClass: 'traffic_light',
        position: [...tl.position],
        bounds: { hw: 0.2, hd: 0.2, h: 4.5 },
        thermalTemp: THERMAL.SIGNATURES.traffic_light,
        soundType: 'signal',
        soundIntensity: 0.3,
      });
    }
  }

  // --- Stop signs (global) ---
  if (worldData.stopSigns) {
    for (const ss of worldData.stopSigns) {
      global.push({
        id: nextId++,
        type: 'stop_sign',
        sensorClass: 'stop_sign',
        position: [...ss.position],
        bounds: { hw: 0.2, hd: 0.2, h: 2.8 },
        thermalTemp: THERMAL.SIGNATURES.stop_sign,
        soundType: null,
        soundIntensity: 0,
      });
    }
  }

  return { byBlock, global };
}

/**
 * Collect all building AABBs from sensor targets (for LOS checks).
 * Returns flat array of { minX, maxX, minZ, maxZ }.
 */
export function collectBuildingAABBs(sensorTargets) {
  const aabbs = [];
  for (const key of Object.keys(sensorTargets.byBlock)) {
    for (const t of sensorTargets.byBlock[key]) {
      if (t.type === 'building') {
        aabbs.push({
          minX: t.minX,
          maxX: t.maxX,
          minZ: t.minZ,
          maxZ: t.maxZ,
        });
      }
    }
  }
  return aabbs;
}
