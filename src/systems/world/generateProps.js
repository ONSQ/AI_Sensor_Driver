// ============================================================
// Zone Props Generation
// Places zone-specific props: construction cones/barriers,
// school zone signs, hospital markers.
// ============================================================

import { ZONE_TYPES, GRID } from '../../constants/world.js';
import { SPEED_LIMITS } from '../../constants/traffic.js';
import { randRange, randBool } from '../../utils/random.js';

/**
 * Generate speed limit signs at the 4 road-facing edges of a block.
 * Signs are placed on the right side of the road for approaching drivers.
 * Each edge gets one sign at a consistent offset from the block center.
 */
function generateSpeedSigns(zone, bounds) {
  const speed = SPEED_LIMITS[zone];
  if (speed == null) return [];

  const { minX, maxX, minZ, maxZ } = bounds;
  const signs = [];

  // Place speed limit signs at each road-facing edge, offset to the right
  // for approaching traffic (consistent with US right-hand traffic)
  const signEdgeOffset = 1.5; // distance from block edge into the road area

  const positions = [
    // North edge — facing southbound driver → sign on left side of road (driver's right)
    { position: [minX - signEdgeOffset, 0, minZ + 8], rotation: Math.PI },
    // South edge — facing northbound driver → sign on right side of road
    { position: [maxX + signEdgeOffset, 0, maxZ - 8], rotation: 0 },
    // West edge — facing eastbound driver → sign on right side of road
    { position: [minX + 8, 0, maxZ + signEdgeOffset], rotation: Math.PI / 2 },
    // East edge — facing westbound driver → sign on left side of road (driver's right)
    { position: [maxX - 8, 0, minZ - signEdgeOffset], rotation: -Math.PI / 2 },
  ];

  for (const sp of positions) {
    signs.push({
      type: 'speed_sign',
      position: sp.position,
      rotation: sp.rotation,
      speed,
    });
  }

  return signs;
}

/**
 * Generate zone-specific props for a block.
 * @param {string} zone
 * @param {{ minX, maxX, minZ, maxZ }} bounds
 * @param {number[]} center — [x, 0, z]
 * @param {function} rng — seeded PRNG
 * @returns {Array<{ type, position, rotation, color, ... }>}
 */
export function generateProps(zone, bounds, center, rng) {
  // Speed limit signs for every zone type
  const speedSigns = generateSpeedSigns(zone, bounds);

  let zoneProps;
  switch (zone) {
    case ZONE_TYPES.CONSTRUCTION:
      zoneProps = generateConstructionProps(bounds, rng);
      break;
    case ZONE_TYPES.SCHOOL:
      zoneProps = generateSchoolProps(bounds, center, rng);
      break;
    case ZONE_TYPES.HOSPITAL:
      zoneProps = generateHospitalProps(bounds, center, rng);
      break;
    default:
      zoneProps = [];
  }

  return [...speedSigns, ...zoneProps];
}

/**
 * Construction zone: cones along road edges + barriers.
 */
function generateConstructionProps(bounds, rng) {
  const props = [];
  const { minX, maxX, minZ, maxZ } = bounds;
  const margin = 1; // 1m inside block edge (adjacent to sidewalk)

  // Place cones along 2 random edges of the block
  const edges = [
    { axis: 'x', fixed: minZ + margin, range: [minX + 2, maxX - 2], rotation: 0 },
    { axis: 'x', fixed: maxZ - margin, range: [minX + 2, maxX - 2], rotation: 0 },
    { axis: 'z', fixed: minX + margin, range: [minZ + 2, maxZ - 2], rotation: 0 },
    { axis: 'z', fixed: maxX - margin, range: [minZ + 2, maxZ - 2], rotation: 0 },
  ];

  // Pick 2 edges for cones
  const selectedEdges = [];
  for (const edge of edges) {
    if (randBool(rng, 0.5) && selectedEdges.length < 2) {
      selectedEdges.push(edge);
    }
  }
  // Ensure at least 1 edge
  if (selectedEdges.length === 0) selectedEdges.push(edges[0]);

  for (const edge of selectedEdges) {
    const [rangeMin, rangeMax] = edge.range;
    const spacing = randRange(rng, 3, 5);
    const count = Math.floor((rangeMax - rangeMin) / spacing);

    for (let i = 0; i < count; i++) {
      const offset = rangeMin + i * spacing + randRange(rng, -0.3, 0.3);
      const position =
        edge.axis === 'x'
          ? [offset, 0, edge.fixed]
          : [edge.fixed, 0, offset];

      props.push({
        type: 'cone',
        position,
        rotation: 0,
      });
    }
  }

  // Place 1-3 barriers
  const barrierCount = Math.floor(randRange(rng, 1, 4));
  for (let i = 0; i < barrierCount; i++) {
    props.push({
      type: 'barrier',
      position: [
        randRange(rng, minX + 3, maxX - 3),
        0,
        randRange(rng, minZ + 3, maxZ - 3),
      ],
      rotation: randBool(rng, 0.5) ? 0 : Math.PI / 2,
    });
  }

  return props;
}

/**
 * School zone: warning signs at block edges facing the road.
 */
function generateSchoolProps(bounds, center, rng) {
  const props = [];
  const { minX, maxX, minZ, maxZ } = bounds;

  // Place warning signs at each road-facing edge of the school block
  const signPositions = [
    { position: [(minX + maxX) / 2, 0, minZ - 1], rotation: 0 },       // north edge
    { position: [(minX + maxX) / 2, 0, maxZ + 1], rotation: Math.PI },  // south edge
    { position: [minX - 1, 0, (minZ + maxZ) / 2], rotation: Math.PI / 2 }, // west edge
    { position: [maxX + 1, 0, (minZ + maxZ) / 2], rotation: -Math.PI / 2 }, // east edge
  ];

  for (const sp of signPositions) {
    props.push({
      type: 'school_sign',
      position: sp.position,
      rotation: sp.rotation,
    });
  }

  return props;
}

/**
 * Hospital zone: red cross markers at all 4 road-facing edges.
 */
function generateHospitalProps(bounds, center, rng) {
  const props = [];
  const { minX, maxX, minZ, maxZ } = bounds;

  // Place a red cross marker on each road-facing edge of the hospital block
  const crossPositions = [
    { position: [(minX + maxX) / 2, 0, minZ - 1], rotation: 0 },             // north edge
    { position: [(minX + maxX) / 2, 0, maxZ + 1], rotation: Math.PI },       // south edge
    { position: [minX - 1, 0, (minZ + maxZ) / 2], rotation: Math.PI / 2 },   // west edge
    { position: [maxX + 1, 0, (minZ + maxZ) / 2], rotation: -Math.PI / 2 },  // east edge
  ];

  for (const cp of crossPositions) {
    props.push({
      type: 'hospital_cross',
      position: cp.position,
      rotation: cp.rotation,
    });
  }

  return props;
}
