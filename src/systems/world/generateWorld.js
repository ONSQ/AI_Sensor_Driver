// ============================================================
// World Generation — Top-level orchestrator
// generateWorld(seed) → complete WorldData object
// ============================================================

import { createRng } from '../../utils/random.js';
import { ZONE_MAP, ZONE_TYPES, GRID, COLORS } from '../../constants/world.js';
import { getBlockCenter, getBlockBounds } from '../../utils/blockLayout.js';
import { generateBuildings } from './generateBuildings.js';
import { generateRoads } from './generateRoads.js';
import { generateTrafficLights, generateStopSigns } from './generateTrafficInfra.js';
import { generateProps } from './generateProps.js';

// Zone types that get colored road edge lines
const ZONE_LINE_COLORS = {
  [ZONE_TYPES.SCHOOL]: COLORS.SCHOOL_ACCENT,      // yellow
  [ZONE_TYPES.HOSPITAL]: COLORS.HOSPITAL_ACCENT,   // red
};

/**
 * Generate the complete world from a seed.
 * Same seed = same world every time.
 *
 * @param {number|string} seed
 * @returns {{
 *   seed: number|string,
 *   blocks: Array<{ row, col, zone, center, bounds, buildings, props }>,
 *   roads: { segments, intersections, crosswalks, laneMarkings, sidewalks }
 * }}
 */
export function generateWorld(seed) {
  const blocks = [];

  for (let row = 0; row < GRID.BLOCKS_PER_SIDE; row++) {
    for (let col = 0; col < GRID.BLOCKS_PER_SIDE; col++) {
      const zone = ZONE_MAP[row][col];
      const center = getBlockCenter(row, col);
      const bounds = getBlockBounds(row, col);

      // Each block gets a deterministic sub-seed so changing one
      // block's generation never affects another block.
      const blockSeed = (typeof seed === 'number' ? seed : 0) + row * 100 + col;
      const rng = createRng(blockSeed);

      const buildings = generateBuildings(zone, bounds, rng);
      const props = generateProps(zone, bounds, center, rng);

      blocks.push({
        row,
        col,
        zone,
        center,
        bounds,
        buildings,
        props,
      });
    }
  }

  // Roads are deterministic (no randomization needed)
  const roads = generateRoads();

  // Traffic infrastructure placed at intersections
  const trafficLights = generateTrafficLights(roads.intersections);
  const stopSigns = generateStopSigns(roads.intersections);

  // Generate colored road edge lines for school and hospital zones
  const zoneRoadLines = generateZoneRoadLines(blocks);

  return { seed, blocks, roads, trafficLights, stopSigns, zoneRoadLines };
}

/**
 * Generate colored road edge lines for school and hospital zones.
 * Places colored line strips on the road edges adjacent to these blocks.
 * Lines run along the full length of each adjacent road segment.
 *
 * @param {Array} blocks
 * @returns {Array<{ position, width, length, color }>}
 */
function generateZoneRoadLines(blocks) {
  const lines = [];
  const lineWidth = 0.3;    // 30cm wide colored line
  const lineY = 0.025;      // just above road surface

  for (const block of blocks) {
    const color = ZONE_LINE_COLORS[block.zone];
    if (!color) continue;

    const { minX, maxX, minZ, maxZ } = block.bounds;
    const roadLen = GRID.BLOCK_SIZE; // length of adjacent road segment

    // North edge of block — line on the road to the north
    // Road center is at minZ - ROAD_WIDTH/2. Line on the block side = minZ - SIDEWALK_WIDTH
    lines.push({
      position: [(minX + maxX) / 2, lineY, minZ - GRID.SIDEWALK_WIDTH - lineWidth / 2],
      width: roadLen,
      length: lineWidth,
      color,
    });

    // South edge
    lines.push({
      position: [(minX + maxX) / 2, lineY, maxZ + GRID.SIDEWALK_WIDTH + lineWidth / 2],
      width: roadLen,
      length: lineWidth,
      color,
    });

    // West edge
    lines.push({
      position: [minX - GRID.SIDEWALK_WIDTH - lineWidth / 2, lineY, (minZ + maxZ) / 2],
      width: lineWidth,
      length: roadLen,
      color,
    });

    // East edge
    lines.push({
      position: [maxX + GRID.SIDEWALK_WIDTH + lineWidth / 2, lineY, (minZ + maxZ) / 2],
      width: lineWidth,
      length: roadLen,
      color,
    });
  }

  return lines;
}
