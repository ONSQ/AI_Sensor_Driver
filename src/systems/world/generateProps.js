// ============================================================
// Zone Props Generation
// Places zone-specific props: construction cones/barriers,
// school zone signs, hospital markers.
// ============================================================

import { ZONE_TYPES, GRID } from '../../constants/world.js';
import { randRange, randBool } from '../../utils/random.js';

/**
 * Generate zone-specific props for a block.
 * @param {string} zone
 * @param {{ minX, maxX, minZ, maxZ }} bounds
 * @param {number[]} center — [x, 0, z]
 * @param {function} rng — seeded PRNG
 * @returns {Array<{ type, position, rotation, color, ... }>}
 */
export function generateProps(zone, bounds, center, rng) {
  switch (zone) {
    case ZONE_TYPES.CONSTRUCTION:
      return generateConstructionProps(bounds, rng);
    case ZONE_TYPES.SCHOOL:
      return generateSchoolProps(bounds, center, rng);
    case ZONE_TYPES.HOSPITAL:
      return generateHospitalProps(bounds, center, rng);
    default:
      return [];
  }
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
 * Hospital zone: red cross marker near the hospital building.
 */
function generateHospitalProps(bounds, center, rng) {
  const props = [];

  // Place a red cross marker in front of the hospital (offset toward nearest road)
  props.push({
    type: 'hospital_cross',
    position: [center[0], 0, bounds.minZ - 1],
    rotation: 0,
  });

  props.push({
    type: 'hospital_cross',
    position: [center[0], 0, bounds.maxZ + 1],
    rotation: Math.PI,
  });

  return props;
}
