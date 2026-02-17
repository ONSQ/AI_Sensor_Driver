// ============================================================
// Zone Props Generation
// Places zone-specific props: construction cones/barriers,
// school zone signs, hospital markers.
// ============================================================

import { ZONE_TYPES, GRID } from '../../constants/world.js';
import { SPEED_LIMITS } from '../../constants/traffic.js';
import { randRange, randBool } from '../../utils/random.js';

/**
 * Generate speed limit signs on the 4 roads adjacent to a block.
 *
 * Each block is bordered by 4 road segments:
 *   - North road (EW): runs along minZ edge, drivers go east (+X) or west (-X)
 *   - South road (EW): runs along maxZ edge, drivers go east (+X) or west (-X)
 *   - West road (NS):  runs along minX edge, drivers go south (+Z) or north (-Z)
 *   - East road (NS):  runs along maxX edge, drivers go south (+Z) or north (-Z)
 *
 * For each road we place ONE sign for the driver approaching/entering the zone.
 * The sign must be on the driver's RIGHT side of the road.
 *
 * Right-hand rule:
 *   Facing +X (east):  right = +Z (south side)
 *   Facing -X (west):  right = -Z (north side)
 *   Facing +Z (south): right = -X (west side)
 *   Facing -Z (north): right = +X (east side)
 *
 * Sign placement: on the road surface, offset from road center to driver's right,
 * positioned BEFORE the block (so driver sees it as they approach).
 */
function generateSpeedSigns(zone, bounds) {
  const speed = SPEED_LIMITS[zone];
  if (speed == null) return [];

  const { minX, maxX, minZ, maxZ } = bounds;
  const signs = [];

  // Road layout: 10m wide — | 2m sidewalk | 3m lane | 3m lane | 2m sidewalk |
  // Road center sits at block edge ± halfRoad (±5m).
  // Intersection centers are at block corners (minX-5, minZ-5), etc.
  // Road SEGMENTS run between intersections, along the block edges.
  //
  // Sign must be ON the road segment (not at intersection).
  // "Along" position: 5m into the segment from the block start edge.
  // "Across" position: on the sidewalk on the driver's right (4m from road center).
  const halfRoad = GRID.ROAD_WIDTH / 2;            // 5
  const sidewalkOffset = halfRoad - 1;              // 4m from road center = sidewalk center
  const alongOffset = 5;                            // 5m into the road segment from block edge

  const positions = [
    // North road (EW) — eastbound driver (→+X), right = +Z (south sidewalk)
    // Road center Z: minZ - halfRoad. South sidewalk Z: minZ - halfRoad + sidewalkOffset = minZ - 1
    // Along road: X = minX + alongOffset (5m into segment, past intersection)
    {
      position: [minX + alongOffset, 0, minZ - halfRoad + sidewalkOffset],
      rotation: -Math.PI / 2,  // faces +X (toward eastbound driver)
    },
    // South road (EW) — westbound driver (→-X), right = -Z (north sidewalk)
    // Road center Z: maxZ + halfRoad. North sidewalk Z: maxZ + halfRoad - sidewalkOffset = maxZ + 1
    // Along road: X = maxX - alongOffset (5m into segment from east end)
    {
      position: [maxX - alongOffset, 0, maxZ + halfRoad - sidewalkOffset],
      rotation: Math.PI / 2,   // faces -X (toward westbound driver)
    },
    // West road (NS) — southbound driver (→+Z), right = -X (west sidewalk)
    // Road center X: minX - halfRoad. West sidewalk X: minX - halfRoad - sidewalkOffset = minX - 9
    // Along road: Z = minZ + alongOffset (5m into segment, past intersection)
    {
      position: [minX - halfRoad - sidewalkOffset, 0, minZ + alongOffset],
      rotation: 0,             // faces +Z (toward southbound driver)
    },
    // East road (NS) — northbound driver (→-Z), right = +X (east sidewalk)
    // Road center X: maxX + halfRoad. East sidewalk X: maxX + halfRoad + sidewalkOffset = maxX + 9
    // Along road: Z = maxZ - alongOffset (5m into segment from south end)
    {
      position: [maxX + halfRoad + sidewalkOffset, 0, maxZ - alongOffset],
      rotation: Math.PI,       // faces -Z (toward northbound driver)
    },
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
