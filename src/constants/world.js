// ============================================================
// World Constants — SensorRacer v2
// All dimensions in meters. Y-up coordinate system.
// ============================================================

// Zone type enum
export const ZONE_TYPES = {
  CITY: 'city',
  SCHOOL: 'school',
  CONSTRUCTION: 'construction',
  RESIDENTIAL: 'residential',
  HOSPITAL: 'hospital',
};

// Grid dimensions
export const GRID = {
  BLOCKS_PER_SIDE: 4,
  BLOCK_SIZE: 40,       // interior buildable area per block
  ROAD_WIDTH: 10,       // total width including sidewalks
  SIDEWALK_WIDTH: 2,    // each side of the road
  LANE_WIDTH: 3,        // per lane
  BLOCK_STRIDE: 50,     // BLOCK_SIZE + ROAD_WIDTH
  WORLD_SIZE: 210,      // 4 * 40 + 5 * 10
};

export const WORLD_HALF = GRID.WORLD_SIZE / 2; // 105

// Fixed zone layout — [row][col], 0-indexed from top-left
// Designed for pedagogical variety: each zone type appears 2-4 times,
// spread across the grid so the player encounters variety while driving.
export const ZONE_MAP = [
  [ZONE_TYPES.RESIDENTIAL, ZONE_TYPES.SCHOOL,        ZONE_TYPES.RESIDENTIAL, ZONE_TYPES.RESIDENTIAL],
  [ZONE_TYPES.CITY,        ZONE_TYPES.CITY,          ZONE_TYPES.HOSPITAL,    ZONE_TYPES.CONSTRUCTION],
  [ZONE_TYPES.CONSTRUCTION, ZONE_TYPES.CITY,         ZONE_TYPES.CITY,        ZONE_TYPES.RESIDENTIAL],
  [ZONE_TYPES.RESIDENTIAL, ZONE_TYPES.HOSPITAL,      ZONE_TYPES.SCHOOL,      ZONE_TYPES.CITY],
];

// Color palette — dark theme with sensor-aesthetic accents
export const COLORS = {
  // Environment
  GROUND: '#1a1a2e',
  GRASS: '#1a3a1a',
  BLOCK_CONCRETE: '#2a2a3e',

  // Roads
  ROAD: '#2a2a2a',
  SIDEWALK: '#4a4a4a',
  ROAD_MARKING: '#cccccc',
  CROSSWALK: '#ffffff',

  // Building palettes (per zone)
  CITY_BUILDINGS: ['#3a3a5e', '#4a4a6e', '#2e2e4e', '#5a5a7e', '#33334d'],
  RESIDENTIAL_BUILDINGS: ['#5a4a3a', '#6a5a4a', '#4a3a2a', '#7a6a5a', '#8a7a6a'],
  CONSTRUCTION_BUILDINGS: ['#6a6a6a', '#7a7a7a', '#5a5a5a', '#8a8a8a'],
  RESIDENTIAL_ROOF: '#5a3a2a',

  // Special building accents
  SCHOOL_BUILDING: '#5a5a8e',
  HOSPITAL_BUILDING: '#5e3a3a',

  // Zone accents (for future signage/props)
  SCHOOL_ACCENT: '#ffcc00',
  CONSTRUCTION_ACCENT: '#ff8800',
  HOSPITAL_ACCENT: '#ff0000',
};

// Lane marking dimensions
export const LANE_MARKING = {
  DASH_LENGTH: 2,
  DASH_WIDTH: 0.15,
  DASH_GAP: 3,
};

// Crosswalk dimensions
export const CROSSWALK = {
  STRIPE_WIDTH: 0.5,
  STRIPE_LENGTH: 3,
  STRIPE_GAP: 0.7,
  STRIPE_COUNT: 6,
};
