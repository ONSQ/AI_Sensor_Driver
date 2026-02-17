// ============================================================
// Traffic Infrastructure Generation
// Places traffic lights at interior intersections,
// stop signs at perimeter intersections.
// ============================================================

import { GRID } from '../../constants/world.js';
import { TRAFFIC_LIGHT_DIMS } from '../../constants/traffic.js';

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
 * Stop sign placement — driver stops AT the sign (near-right corner).
 *
 * Each approach places the stop sign on the RIGHT side of the driver's lane,
 * at the NEAR edge of the intersection (just before the driver enters).
 * The sign faces the approaching driver.
 *
 * Coordinate system (bird's eye, Y-up):
 *   +X = East,  -X = West,  +Z = South,  -Z = North
 *
 *   Driver from north (→ south +Z): right = +X, near edge = -Z
 *     Sign at [ix + right, 0, iz - halfRoad]  faces Math.PI (-Z toward driver)
 *
 *   Driver from south (→ north -Z): right = -X, near edge = +Z
 *     Sign at [ix - right, 0, iz + halfRoad]  faces 0 (+Z toward driver)
 *
 *   Driver from east (→ west -X): right = -Z, near edge = +X
 *     Sign at [ix + halfRoad, 0, iz - right]  faces -π/2 (+X toward driver)
 *
 *   Driver from west (→ east +X): right = +Z, near edge = -X
 *     Sign at [ix - halfRoad, 0, iz + right]  faces π/2 (-X toward driver)
 */
const STOP_APPROACHES = [
  {
    id: 'north',
    // Driver from north → south. Right = +X, near edge = iz - halfRoad
    getPos: (ix, iz, halfRoad, right) => [ix + right, 0, iz - halfRoad],
    facingAngle: Math.PI,
    checkBoundary: (row, _col, _max) => row > 0,
  },
  {
    id: 'south',
    // Driver from south → north. Right = -X, near edge = iz + halfRoad
    getPos: (ix, iz, halfRoad, right) => [ix - right, 0, iz + halfRoad],
    facingAngle: 0,
    checkBoundary: (row, _col, max) => row < max,
  },
  {
    id: 'east',
    // Driver from east → west. Right = -Z, near edge = ix + halfRoad
    getPos: (ix, iz, halfRoad, right) => [ix + halfRoad, 0, iz - right],
    facingAngle: -Math.PI / 2,
    checkBoundary: (_row, col, max) => col < max,
  },
  {
    id: 'west',
    // Driver from west → east. Right = +Z, near edge = ix - halfRoad
    getPos: (ix, iz, halfRoad, right) => [ix - halfRoad, 0, iz + right],
    facingAngle: Math.PI / 2,
    checkBoundary: (_row, col, _max) => col > 0,
  },
];

/**
 * Generate stop sign placement data for intersections without traffic lights.
 * Only places signs on approaches that connect to actual road segments
 * (perimeter intersections may not have roads on all 4 sides).
 * @param {Array} intersections — from generateRoads()
 * @returns {Array<{ id, intersectionId, position, rotation }>}
 */
export function generateStopSigns(intersections) {
  const signs = [];
  const halfRoad = GRID.ROAD_WIDTH / 2;    // 5m — distance from center to edge
  const rightOffset = 4;                     // how far right of road center (on sidewalk edge)
  const roadCount = GRID.BLOCKS_PER_SIDE + 1; // 5
  const maxIdx = roadCount - 1;

  for (const inter of intersections) {
    if (inter.hasTrafficLight) continue;

    const [ix, , iz] = inter.position;
    const parts = inter.id.split('-');
    const iRow = parseInt(parts[1]);
    const iCol = parseInt(parts[2]);

    for (const approach of STOP_APPROACHES) {
      if (!approach.checkBoundary(iRow, iCol, maxIdx)) continue;

      signs.push({
        id: `stop-${inter.id}-${approach.id}`,
        intersectionId: inter.id,
        position: approach.getPos(ix, iz, halfRoad, rightOffset),
        rotation: approach.facingAngle,
      });
    }
  }

  return signs;
}
