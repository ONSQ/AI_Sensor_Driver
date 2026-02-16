// ============================================================
// Building Generation — Procedural buildings per zone type
// Pure function: (zone, blockBounds, rng) → building descriptors[]
// ============================================================

import { ZONE_TYPES, COLORS } from '../../constants/world.js';
import { randRange, randPick } from '../../utils/random.js';

// Per-zone generation configuration
const ZONE_CONFIG = {
  [ZONE_TYPES.CITY]: {
    density: 0.85,
    heightRange: [12, 50],
    widthRange: [6, 14],
    depthRange: [6, 14],
    palette: COLORS.CITY_BUILDINGS,
    roofType: 'flat',
    subCells: 4,
    specialBuilding: null,
  },
  [ZONE_TYPES.RESIDENTIAL]: {
    density: 0.45,
    heightRange: [4, 8],
    widthRange: [8, 12],
    depthRange: [6, 10],
    palette: COLORS.RESIDENTIAL_BUILDINGS,
    roofType: 'pitched',
    subCells: 3,
    specialBuilding: null,
  },
  [ZONE_TYPES.SCHOOL]: {
    density: 0.4,
    heightRange: [4, 8],
    widthRange: [8, 12],
    depthRange: [6, 10],
    palette: COLORS.RESIDENTIAL_BUILDINGS,
    roofType: 'pitched',
    subCells: 3,
    specialBuilding: {
      width: 20,
      depth: 15,
      height: 8,
      color: COLORS.SCHOOL_BUILDING,
      roofType: 'flat',
    },
  },
  [ZONE_TYPES.CONSTRUCTION]: {
    density: 0.5,
    heightRange: [8, 30],
    widthRange: [6, 12],
    depthRange: [6, 12],
    palette: COLORS.CONSTRUCTION_BUILDINGS,
    roofType: 'flat',
    subCells: 3,
    specialBuilding: null,
  },
  [ZONE_TYPES.HOSPITAL]: {
    density: 0.6,
    heightRange: [10, 35],
    widthRange: [6, 14],
    depthRange: [6, 14],
    palette: COLORS.CITY_BUILDINGS,
    roofType: 'flat',
    subCells: 4,
    specialBuilding: {
      width: 18,
      depth: 18,
      height: 20,
      color: COLORS.HOSPITAL_BUILDING,
      roofType: 'flat',
    },
  },
};

/**
 * Generate building descriptors for a single block.
 * @param {string} zone - One of ZONE_TYPES values
 * @param {{ minX, maxX, minZ, maxZ }} blockBounds
 * @param {function} rng - Seeded PRNG
 * @returns {Array<{ position: number[], width: number, depth: number, height: number, color: string, roofType: string, type: string }>}
 */
export function generateBuildings(zone, blockBounds, rng) {
  const config = ZONE_CONFIG[zone];
  if (!config) return [];

  const buildings = [];
  const blockW = blockBounds.maxX - blockBounds.minX; // 40
  const cellSize = blockW / config.subCells;
  const midCell = Math.floor(config.subCells / 2);

  // Place special building at center if the zone has one
  if (config.specialBuilding) {
    const sb = config.specialBuilding;
    buildings.push({
      position: [
        (blockBounds.minX + blockBounds.maxX) / 2,
        0,
        (blockBounds.minZ + blockBounds.maxZ) / 2,
      ],
      width: sb.width,
      depth: sb.depth,
      height: sb.height,
      color: sb.color,
      roofType: sb.roofType,
      type: 'special',
    });
  }

  // Fill sub-cells with regular buildings
  for (let r = 0; r < config.subCells; r++) {
    for (let c = 0; c < config.subCells; c++) {
      // Skip center cell if special building is there
      if (config.specialBuilding && r === midCell && c === midCell) {
        continue;
      }

      // Density check — skip this cell randomly
      if (rng() > config.density) continue;

      const cellCenterX = blockBounds.minX + (c + 0.5) * cellSize;
      const cellCenterZ = blockBounds.minZ + (r + 0.5) * cellSize;

      // Random offset within cell (±15% of cell size)
      const offsetX = randRange(rng, -cellSize * 0.15, cellSize * 0.15);
      const offsetZ = randRange(rng, -cellSize * 0.15, cellSize * 0.15);

      // Random dimensions within zone range, clamped to fit cell
      const maxDim = cellSize - 1; // 1m gap between buildings
      const width = Math.min(
        randRange(rng, config.widthRange[0], config.widthRange[1]),
        maxDim,
      );
      const depth = Math.min(
        randRange(rng, config.depthRange[0], config.depthRange[1]),
        maxDim,
      );
      const height = randRange(rng, config.heightRange[0], config.heightRange[1]);

      buildings.push({
        position: [cellCenterX + offsetX, 0, cellCenterZ + offsetZ],
        width,
        depth,
        height,
        color: randPick(rng, config.palette),
        roofType: config.roofType,
        type: zone,
      });
    }
  }

  return buildings;
}
