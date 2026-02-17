// ============================================================
// Traffic Infrastructure Generation
// Places traffic lights at interior intersections,
// stop signs at perimeter intersections.
// ============================================================

import { GRID } from '../../constants/world.js';
import {
  TRAFFIC_LIGHT_DIMS,
  STOP_SIGN_DIMS,
} from '../../constants/traffic.js';

/**
 * 4 approach directions for an intersection.
 * Each defines where to place the pole relative to intersection center,
 * and what rotation the light/sign should face.
 *
 * Poles are placed at the far-right corner of their approach
 * (like real traffic lights — on the right side of the road you're driving on).
 */
const APPROACHES = [
  {
    id: 'north',
    axis: 'ns',
    // Approaching from the north (driving south): pole at top-right corner
    poleOffset: [1, 0, -1],
    facingAngle: Math.PI,        // faces south (toward approaching traffic)
  },
  {
    id: 'south',
    axis: 'ns',
    // Approaching from the south (driving north): pole at bottom-left corner
    poleOffset: [-1, 0, 1],
    facingAngle: 0,              // faces north
  },
  {
    id: 'east',
    axis: 'ew',
    // Approaching from the east (driving west): pole at top-right corner
    poleOffset: [1, 0, 1],
    facingAngle: -Math.PI / 2,   // faces west
  },
  {
    id: 'west',
    axis: 'ew',
    // Approaching from the west (driving east): pole at bottom-left corner
    poleOffset: [-1, 0, -1],
    facingAngle: Math.PI / 2,    // faces east
  },
];

/**
 * Generate traffic light placement data for intersections with lights.
 * @param {Array} intersections — from generateRoads()
 * @returns {Array<{ id, intersectionId, position, rotation, axis }>}
 */
export function generateTrafficLights(intersections) {
  const lights = [];
  const offset = TRAFFIC_LIGHT_DIMS.CORNER_OFFSET;

  for (const inter of intersections) {
    if (!inter.hasTrafficLight) continue;

    const [ix, , iz] = inter.position;

    for (const approach of APPROACHES) {
      lights.push({
        id: `light-${inter.id}-${approach.id}`,
        intersectionId: inter.id,
        direction: approach.id,
        axis: approach.axis,
        position: [
          ix + approach.poleOffset[0] * offset,
          0,
          iz + approach.poleOffset[2] * offset,
        ],
        rotation: approach.facingAngle,
      });
    }
  }

  return lights;
}

/**
 * Generate stop sign placement data for intersections without traffic lights.
 * Only places signs on approaches that connect to actual road segments
 * (perimeter intersections may not have roads on all 4 sides).
 * @param {Array} intersections — from generateRoads()
 * @returns {Array<{ id, intersectionId, position, rotation }>}
 */
export function generateStopSigns(intersections) {
  const signs = [];
  const offset = STOP_SIGN_DIMS.CORNER_OFFSET;
  const roadCount = GRID.BLOCKS_PER_SIDE + 1; // 5

  for (const inter of intersections) {
    if (inter.hasTrafficLight) continue;

    const [ix, , iz] = inter.position;
    // Parse row/col from intersection id
    const parts = inter.id.split('-');
    const iRow = parseInt(parts[1]);
    const iCol = parseInt(parts[2]);

    // Only place signs on approaches that have connecting road segments
    for (const approach of APPROACHES) {
      let hasRoad = true;
      if (approach.id === 'north' && iRow === 0) hasRoad = false;
      if (approach.id === 'south' && iRow === roadCount - 1) hasRoad = false;
      if (approach.id === 'west' && iCol === 0) hasRoad = false;
      if (approach.id === 'east' && iCol === roadCount - 1) hasRoad = false;

      if (!hasRoad) continue;

      signs.push({
        id: `stop-${inter.id}-${approach.id}`,
        intersectionId: inter.id,
        position: [
          ix + approach.poleOffset[0] * offset,
          0,
          iz + approach.poleOffset[2] * offset,
        ],
        rotation: approach.facingAngle,
      });
    }
  }

  return signs;
}
