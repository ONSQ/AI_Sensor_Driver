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
/**
 * Right-hand traffic (US-style) signal placement.
 *
 * Each approach gets a signal on the RIGHT side of its lane, placed
 * just BEFORE the intersection (near edge). To avoid overlapping
 * corners, each approach's pole is positioned on the right side of
 * the road but offset along the approach direction to a unique spot.
 *
 * The signal faces the approaching driver (perpendicular to travel).
 *
 * Coordinate system (bird's eye, Y-up):
 *   +X = East,  -X = West
 *   +Z = South, -Z = North
 *
 *          -Z (North)
 *              |
 *    NW(-X,-Z)     NE(+X,-Z)
 *              |
 *    -X ----[INTER]---- +X
 *              |
 *    SW(-X,+Z)     SE(+X,+Z)
 *              |
 *          +Z (South)
 *
 * Three.js Y-rotation: 0=faces+Z, π=faces-Z, -π/2=faces+X, π/2=faces-X
 */
const APPROACHES = [
  {
    id: 'north',
    axis: 'ns',
    // Driver from north, driving south (+Z). Right = +X, near = -Z.
    // Pole at NE corner. Faces north (toward driver).
    poleOffset: [1, 0, -1],
    facingAngle: Math.PI,
  },
  {
    id: 'south',
    axis: 'ns',
    // Driver from south, driving north (-Z). Right = -X, near = +Z.
    // Pole at SW corner. Faces south (toward driver).
    poleOffset: [-1, 0, 1],
    facingAngle: 0,
  },
  {
    id: 'east',
    axis: 'ew',
    // Driver from east, driving west (-X). Right = -Z, far = -X.
    // Pole at NW corner (far-right). Faces east (toward driver).
    poleOffset: [-1, 0, -1],
    facingAngle: -Math.PI / 2,
  },
  {
    id: 'west',
    axis: 'ew',
    // Driver from west, driving east (+X). Right = +Z, far = +X.
    // Pole at SE corner (far-right). Faces west (toward driver).
    poleOffset: [1, 0, 1],
    facingAngle: Math.PI / 2,
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
