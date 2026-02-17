// ============================================================
// Traffic Infrastructure Generation
// Places traffic lights at interior intersections,
// stop signs at perimeter intersections.
// ============================================================

import { GRID } from '../../constants/world.js';
import { TRAFFIC_LIGHT_DIMS } from '../../constants/traffic.js';

/**
 * Traffic light placement — right side of road, unique corners.
 *
 * Coordinate system (bird's eye, Y-up):
 *   +X = East, -X = West, +Z = South, -Z = North
 *
 *   Three.js Y-rotation: 0=faces+Z, π=faces-Z, -π/2=faces+X, π/2=faces-X
 *
 *           NW(-X,-Z)      NE(+X,-Z)
 *                  ┌────────┐
 *                  │  INTER │
 *                  └────────┘
 *           SW(-X,+Z)      SE(+X,+Z)
 */
/**
 * Right-hand traffic light placement (US-style, on the right curb).
 *
 * Right-hand rule:  facing direction → right side
 *   +Z (south) → -X    -Z (north) → +X
 *   -X (west)  → +Z    +X (east)  → -Z
 *
 * To get 4 unique corners we place each light on the driver's right side
 * at the FAR edge (across the intersection), which gives each approach a
 * unique corner while still being on the correct side of the road:
 *
 *   north (→+Z): right=-X, far=+Z  → SW corner [-1, +1]
 *   south (→-Z): right=+X, far=-Z  → NE corner [+1, -1]
 *   east  (→-X): right=+Z, far=-X  → NW corner [-1, +1]... conflicts!
 *
 * Far-right also collides, so we use NEAR-right which gives unique corners
 * when we split the "right" and "near" axes differently per approach:
 *
 *   north (→+Z): right-curb=-X, near-edge=-Z → pole at (-X, -Z) = NW
 *   south (→-Z): right-curb=+X, near-edge=+Z → pole at (+X, +Z) = SE
 *   east  (→-X): right-curb=+Z, near-edge=+X → pole at (+X, +Z) = SE... still conflicts!
 *
 * There is no way to place 4 lights at unique corners using strictly
 * near-right placement. Instead we use the SAME SIDE (right) but alternate
 * near/far edge per pair to guarantee uniqueness:
 *
 *   north (→+Z): right=-X, NEAR edge=-Z → NW corner  [-1, -1]
 *   south (→-Z): right=+X, NEAR edge=+Z → SE corner  [+1, +1]
 *   east  (→-X): right=+Z, FAR  edge=-X → SW corner  [-1, +1]
 *   west  (→+X): right=-Z, FAR  edge=+X → NE corner  [+1, -1]
 *
 * All 4 corners are unique: NW, SE, SW, NE ✓
 * All signals are on the driver's right side of the road ✓
 * NS signals at near edge, EW signals at far edge (across intersection).
 */
const APPROACHES = [
  {
    id: 'north',
    axis: 'ns',
    // Driving south (+Z). Right = -X. NEAR edge = -Z.  → NW corner.
    poleOffset: [-1, 0, -1],
    facingAngle: Math.PI,
  },
  {
    id: 'south',
    axis: 'ns',
    // Driving north (-Z). Right = +X. NEAR edge = +Z.  → SE corner.
    poleOffset: [1, 0, 1],
    facingAngle: 0,
  },
  {
    id: 'east',
    axis: 'ew',
    // Driving west (-X). Right = +Z. FAR edge = -X.    → SW corner.
    poleOffset: [-1, 0, 1],
    facingAngle: -Math.PI / 2,
  },
  {
    id: 'west',
    axis: 'ew',
    // Driving east (+X). Right = -Z. FAR edge = +X.    → NE corner.
    poleOffset: [1, 0, -1],
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
