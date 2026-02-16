// ============================================================
// Block Layout — Grid-to-World Coordinate Math
// Converts grid indices (row, col) to world-space positions.
// ============================================================

import { GRID, WORLD_HALF } from '../constants/world.js';

/**
 * Get the world-space center of block (row, col).
 * @param {number} row 0–3
 * @param {number} col 0–3
 * @returns {[number, number, number]} [x, 0, z]
 */
export function getBlockCenter(row, col) {
  const x = -WORLD_HALF + GRID.ROAD_WIDTH + GRID.BLOCK_SIZE / 2 + col * GRID.BLOCK_STRIDE;
  const z = -WORLD_HALF + GRID.ROAD_WIDTH + GRID.BLOCK_SIZE / 2 + row * GRID.BLOCK_STRIDE;
  return [x, 0, z];
}

/**
 * Get the axis-aligned bounding box of block (row, col).
 * @returns {{ minX, maxX, minZ, maxZ }}
 */
export function getBlockBounds(row, col) {
  const [cx, , cz] = getBlockCenter(row, col);
  const half = GRID.BLOCK_SIZE / 2;
  return {
    minX: cx - half,
    maxX: cx + half,
    minZ: cz - half,
    maxZ: cz + half,
  };
}

/**
 * Get the world-space center of intersection (row, col) in the 5×5 grid.
 * @param {number} row 0–4
 * @param {number} col 0–4
 * @returns {[number, number, number]} [x, 0, z]
 */
export function getIntersectionCenter(row, col) {
  const x = -WORLD_HALF + GRID.ROAD_WIDTH / 2 + col * GRID.BLOCK_STRIDE;
  const z = -WORLD_HALF + GRID.ROAD_WIDTH / 2 + row * GRID.BLOCK_STRIDE;
  return [x, 0, z];
}

/**
 * Get data for a road segment between two adjacent intersections.
 * @param {number} row
 * @param {number} col
 * @param {'horizontal'|'vertical'} orientation
 */
export function getRoadSegmentData(row, col, orientation) {
  if (orientation === 'horizontal') {
    const start = getIntersectionCenter(row, col);
    const end = getIntersectionCenter(row, col + 1);
    return {
      id: `road-h-${row}-${col}`,
      orientation: 'horizontal',
      center: [(start[0] + end[0]) / 2, 0, start[2]],
      length: GRID.BLOCK_SIZE,
      width: GRID.ROAD_WIDTH,
    };
  } else {
    const start = getIntersectionCenter(row, col);
    const end = getIntersectionCenter(row + 1, col);
    return {
      id: `road-v-${row}-${col}`,
      orientation: 'vertical',
      center: [start[0], 0, (start[2] + end[2]) / 2],
      length: GRID.BLOCK_SIZE,
      width: GRID.ROAD_WIDTH,
    };
  }
}
