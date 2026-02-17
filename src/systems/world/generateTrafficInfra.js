// ============================================================
// Traffic Infrastructure Generation
// Places traffic lights at interior intersections,
// stop signs at perimeter intersections.
// ============================================================

import { GRID } from '../../constants/world.js';
import { TRAFFIC_LIGHT_DIMS } from '../../constants/traffic.js';

/**
 * Traffic light placement — one signal per corner, facing diagonally.
 *
 * US-style 4-way signalized intersection: one signal pole stands at
 * each of the 4 corners. Each signal faces the approach that is
 * diagonally across the intersection from it.
 *
 * Coordinate system (bird's eye, Y-up):
 *   +X = East, -X = West, +Z = South, -Z = North
 *   Three.js Y-rotation: 0=faces+Z, π=faces-Z, -π/2=faces+X, π/2=faces-X
 *
 *   NW corner [-X,-Z]: faces +Z (south) → serves NORTH approach (southbound driver)
 *   NE corner [+X,-Z]: faces +Z (south) → (not used separately; shares with south)
 *
 * Corner-to-approach mapping (diagonally across):
 *   SW corner [-X, +Z] → faces north (-Z, π)    → serves NORTH approach (southbound)
 *   NE corner [+X, -Z] → faces south (+Z, 0)    → serves SOUTH approach (northbound)
 *   SE corner [+X, +Z] → faces west  (-X, π/2)  → serves EAST  approach (westbound)
 *   NW corner [-X, -Z] → faces east  (+X, -π/2) → serves WEST  approach (eastbound)
 *
 * All 4 corners are unique ✓
 * Each signal faces toward the approaching driver from the far side ✓
 * Matches real-world US intersection layout with signal at each corner ✓
 */
const LIGHT_CORNERS = [
  {
    id: 'north',
    axis: 'ns',
    // Southbound driver looks across to far-right → SW corner
    corner: [-1, 0, 1],    // SW
    facingAngle: Math.PI,   // faces -Z (north, toward the driver)
  },
  {
    id: 'south',
    axis: 'ns',
    // Northbound driver looks across to far-right → NE corner
    corner: [1, 0, -1],    // NE
    facingAngle: 0,         // faces +Z (south, toward the driver)
  },
  {
    id: 'east',
    axis: 'ew',
    // Westbound driver looks across to far-right → SE corner
    corner: [1, 0, 1],     // SE
    facingAngle: -Math.PI / 2, // faces +X (east, toward the driver)
  },
  {
    id: 'west',
    axis: 'ew',
    // Eastbound driver looks across to far-right → NW corner
    corner: [-1, 0, -1],   // NW
    facingAngle: Math.PI / 2,  // faces -X (west, toward the driver)
  },
];

/**
 * Generate traffic light placement data for intersections with lights.
 * @param {Array} intersections — from generateRoads()
 * @returns {Array<{ id, intersectionId, position, rotation, axis }>}
 */
export function generateTrafficLights(intersections) {
  const lights = [];
  const cornerOffset = TRAFFIC_LIGHT_DIMS.CORNER_OFFSET; // 3.5m from center

  for (const inter of intersections) {
    if (!inter.hasTrafficLight) continue;

    const [ix, , iz] = inter.position;

    for (const lc of LIGHT_CORNERS) {
      lights.push({
        id: `light-${inter.id}-${lc.id}`,
        intersectionId: inter.id,
        direction: lc.id,
        axis: lc.axis,
        position: [
          ix + lc.corner[0] * cornerOffset,
          0,
          iz + lc.corner[2] * cornerOffset,
        ],
        rotation: lc.facingAngle,
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
 * Right-hand rule for facing direction → right side:
 *   Facing +Z (south) → right = -X
 *   Facing -Z (north) → right = +X
 *   Facing -X (west)  → right = +Z
 *   Facing +X (east)  → right = -Z
 *
 * Coordinate system (bird's eye, Y-up):
 *   +X = East,  -X = West,  +Z = South,  -Z = North
 *
 *   Driver from north (→ south +Z): right = -X, near edge = -Z
 *     Sign at [ix - right, 0, iz - halfRoad]  faces Math.PI (toward -Z)
 *
 *   Driver from south (→ north -Z): right = +X, near edge = +Z
 *     Sign at [ix + right, 0, iz + halfRoad]  faces 0 (toward +Z)
 *
 *   Driver from east (→ west -X): right = +Z, near edge = +X
 *     Sign at [ix + halfRoad, 0, iz + right]  faces -π/2 (toward +X)
 *
 *   Driver from west (→ east +X): right = -Z, near edge = -X
 *     Sign at [ix - halfRoad, 0, iz - right]  faces π/2 (toward -X)
 */
const STOP_APPROACHES = [
  {
    id: 'north',
    // Driver from north → traveling south (+Z). Facing +Z → right = -X.
    // Right lane = -X half. Sign on right = ix - right, near edge = iz - halfRoad.
    getPos: (ix, iz, halfRoad, right) => [ix - right, 0, iz - halfRoad],
    facingAngle: Math.PI,
    checkBoundary: (row, _col, _max) => row > 0,
  },
  {
    id: 'south',
    // Driver from south → traveling north (-Z). Facing -Z → right = +X.
    // Right lane = +X half. Sign on right = ix + right, near edge = iz + halfRoad.
    getPos: (ix, iz, halfRoad, right) => [ix + right, 0, iz + halfRoad],
    facingAngle: 0,
    checkBoundary: (row, _col, max) => row < max,
  },
  {
    id: 'east',
    // Driver from east → traveling west (-X). Facing -X → right = +Z.
    // Right lane = +Z half. Sign on right = iz + right, near edge = ix + halfRoad.
    getPos: (ix, iz, halfRoad, right) => [ix + halfRoad, 0, iz + right],
    facingAngle: -Math.PI / 2,
    checkBoundary: (_row, col, max) => col < max,
  },
  {
    id: 'west',
    // Driver from west → traveling east (+X). Facing +X → right = -Z.
    // Right lane = -Z half. Sign on right = iz - right, near edge = ix - halfRoad.
    getPos: (ix, iz, halfRoad, right) => [ix - halfRoad, 0, iz - right],
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
