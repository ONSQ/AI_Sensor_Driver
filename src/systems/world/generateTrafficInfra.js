// ============================================================
// Traffic Infrastructure Generation
// Places traffic lights at interior intersections,
// stop signs at perimeter intersections.
// ============================================================

import { GRID } from '../../constants/world.js';
import { TRAFFIC_LIGHT_DIMS } from '../../constants/traffic.js';

/**
 * Traffic light placement — FAR-RIGHT from driver's perspective.
 *
 * US-style: the driver looks ACROSS the intersection to see the signal
 * on the far side, on the RIGHT side of the road.
 *
 * Right-hand rule (facing direction → right side):
 *   +Z (south) → -X    -Z (north) → +X
 *   -X (west)  → +Z    +X (east)  → -Z
 *
 * Coordinate system (bird's eye, Y-up):
 *   +X = East, -X = West, +Z = South, -Z = North
 *   Three.js Y-rotation: 0=faces+Z, π=faces-Z, -π/2=faces+X, π/2=faces-X
 *
 * Each approach's signal position:
 *   north (→+Z): right=-X, FAR edge=+Z → pole at [ix - right, iz + far]
 *   south (→-Z): right=+X, FAR edge=-Z → pole at [ix + right, iz - far]
 *   east  (→-X): right=+Z, FAR edge=-X → pole at [ix - far,   iz + right]
 *   west  (→+X): right=-Z, FAR edge=+X → pole at [ix + far,   iz - right]
 *
 * The right offset and far offset use different values to ensure all
 * 4 poles get unique positions (no two at the same spot).
 *   rightOffset = 4m  (on the sidewalk, right side of driver's lane)
 *   farOffset   = 5m  (at the far edge of the intersection)
 */
const LIGHT_APPROACHES = [
  {
    id: 'north',
    axis: 'ns',
    // Driving south (+Z). Right = -X. Far edge = +Z.
    // Signal across intersection, on the right → SW area.
    getPos: (ix, iz, far, right) => [ix - right, 0, iz + far],
    facingAngle: Math.PI, // faces -Z (toward driver from north)
  },
  {
    id: 'south',
    axis: 'ns',
    // Driving north (-Z). Right = +X. Far edge = -Z.
    // Signal across intersection, on the right → NE area.
    getPos: (ix, iz, far, right) => [ix + right, 0, iz - far],
    facingAngle: 0, // faces +Z (toward driver from south)
  },
  {
    id: 'east',
    axis: 'ew',
    // Driving west (-X). Right = +Z. Far edge = -X.
    // Signal across intersection, on the right → SW area.
    getPos: (ix, iz, far, right) => [ix - far, 0, iz + right],
    facingAngle: -Math.PI / 2, // faces +X (toward driver from east)
  },
  {
    id: 'west',
    axis: 'ew',
    // Driving east (+X). Right = -Z. Far edge = +X.
    // Signal across intersection, on the right → NE area.
    getPos: (ix, iz, far, right) => [ix + far, 0, iz - right],
    facingAngle: Math.PI / 2, // faces -X (toward driver from west)
  },
];

/**
 * Generate traffic light placement data for intersections with lights.
 * @param {Array} intersections — from generateRoads()
 * @returns {Array<{ id, intersectionId, position, rotation, axis }>}
 */
export function generateTrafficLights(intersections) {
  const lights = [];
  const halfRoad = GRID.ROAD_WIDTH / 2;  // 5m — at the intersection edge
  const rightOffset = 4;                   // right side of road (on sidewalk)

  for (const inter of intersections) {
    if (!inter.hasTrafficLight) continue;

    const [ix, , iz] = inter.position;

    for (const approach of LIGHT_APPROACHES) {
      lights.push({
        id: `light-${inter.id}-${approach.id}`,
        intersectionId: inter.id,
        direction: approach.id,
        axis: approach.axis,
        position: approach.getPos(ix, iz, halfRoad, rightOffset),
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
