// ============================================================
// World Generation — Top-level orchestrator
// generateWorld(seed) → complete WorldData object
// ============================================================

import { createRng } from '../../utils/random.js';
import { ZONE_MAP, GRID } from '../../constants/world.js';
import { getBlockCenter, getBlockBounds } from '../../utils/blockLayout.js';
import { generateBuildings } from './generateBuildings.js';
import { generateRoads } from './generateRoads.js';
import { generateTrafficLights, generateStopSigns } from './generateTrafficInfra.js';
import { generateProps } from './generateProps.js';

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

  return { seed, blocks, roads, trafficLights, stopSigns };
}
