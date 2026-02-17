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
 * Stop sign placement — one per corner, same layout as traffic lights.
 *
 * Uses the same diagonal corner mapping as LIGHT_CORNERS so that each
 * approach's sign occupies a unique corner. At perimeter intersections
 * not all 4 approaches exist, so some corners remain empty.
 *
 * Corner-to-approach mapping (same as traffic lights):
 *   SW corner [-X, +Z] → faces north (π)    → NORTH approach (southbound driver)
 *   NE corner [+X, -Z] → faces south (0)    → SOUTH approach (northbound driver)
 *   SE corner [+X, +Z] → faces east  (-π/2) → EAST  approach (westbound driver)
 *   NW corner [-X, -Z] → faces west  (π/2)  → WEST  approach (eastbound driver)
 */
const STOP_CORNERS = [
  {
    id: 'north',
    corner: [-1, 0, 1],       // SW
    facingAngle: Math.PI,
    checkBoundary: (row, _col, _max) => row > 0,
  },
  {
    id: 'south',
    corner: [1, 0, -1],       // NE
    facingAngle: 0,
    checkBoundary: (row, _col, max) => row < max,
  },
  {
    id: 'east',
    corner: [1, 0, 1],        // SE
    facingAngle: -Math.PI / 2,
    checkBoundary: (_row, col, max) => col < max,
  },
  {
    id: 'west',
    corner: [-1, 0, -1],      // NW
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
  const cornerOffset = TRAFFIC_LIGHT_DIMS.CORNER_OFFSET; // same offset as lights
  const roadCount = GRID.BLOCKS_PER_SIDE + 1; // 5
  const maxIdx = roadCount - 1;

  for (const inter of intersections) {
    if (inter.hasTrafficLight) continue;

    const [ix, , iz] = inter.position;
    const parts = inter.id.split('-');
    const iRow = parseInt(parts[1]);
    const iCol = parseInt(parts[2]);

    for (const sc of STOP_CORNERS) {
      if (!sc.checkBoundary(iRow, iCol, maxIdx)) continue;

      signs.push({
        id: `stop-${inter.id}-${sc.id}`,
        intersectionId: inter.id,
        position: [
          ix + sc.corner[0] * cornerOffset,
          0,
          iz + sc.corner[2] * cornerOffset,
        ],
        rotation: sc.facingAngle,
      });
    }
  }

  return signs;
}
