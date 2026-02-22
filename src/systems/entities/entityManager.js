// ============================================================
// Entity Manager — Spawn & Tick orchestrator
// spawnEntities(seed, worldData) creates all world entities.
// tickEntities(entities, delta, trafficState, playerPosition)
// advances every entity one simulation step.
// ============================================================

import { createRng, randRange, randInt, randPick, randBool } from '../../utils/random.js';
import { getIntersectionCenter } from '../../utils/blockLayout.js';
import { GRID, WORLD_HALF, ZONE_MAP } from '../../constants/world.js';
import {
  ENTITY_COUNTS,
  PEDESTRIAN,
  NPC_VEHICLE,
  SCHOOL_BUS,
  EMERGENCY,
  ANIMAL,
  BALL,
} from '../../constants/entities.js';
import { VEHICLE_START } from '../../constants/vehicle.js';
import { tickPedestrian } from './pedestrianBehavior.js';
import { tickNpcVehicle } from './npcVehicleBehavior.js';
import { tickAnimal } from './animalBehavior.js';
import { tickEmergency } from './emergencyBehavior.js';
import { tickBall } from './ballTrigger.js';

// ---- helpers ----

let _nextId = 0;
/** Generate a unique numeric entity ID. */
function uid() {
  return _nextId++;
}

/**
 * Find the zone type for a world position.
 * Maps the xz position to the nearest block in the 4x4 grid.
 * @param {number} x
 * @param {number} z
 * @returns {string} zone type
 */
function getZoneAt(x, z) {
  const col = Math.min(3, Math.max(0, Math.round((x + WORLD_HALF - GRID.ROAD_WIDTH - GRID.BLOCK_SIZE / 2) / GRID.BLOCK_STRIDE)));
  const row = Math.min(3, Math.max(0, Math.round((z + WORLD_HALF - GRID.ROAD_WIDTH - GRID.BLOCK_SIZE / 2) / GRID.BLOCK_STRIDE)));
  return ZONE_MAP[row][col];
}

/**
 * Collect all 5x5 intersection centers.
 * @returns {Array<{row: number, col: number, pos: number[]}>}
 */
function allIntersections() {
  const out = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const [x, , z] = getIntersectionCenter(r, c);
      out.push({ row: r, col: c, pos: [x, z] });
    }
  }
  return out;
}

/**
 * Build a sequence of valid road waypoints to form a driving route.
 * Constrains the vehicle to follow orthogonal grid paths, keeping them on the road.
 * @param {Function} rng
 * @param {number[]} start
 * @param {boolean} targetSchools
 * @returns {number[][]}
 */
function buildGridRoute(rng, start, targetSchools = false) {
  const ints = allIntersections();
  const startPos = nearestIntersection(start[0], start[2]);
  let current = ints.find(i => i.pos[0] === startPos[0] && i.pos[1] === startPos[1]) || ints[0];

  const route = [];
  let prev = null;
  const numSteps = randInt(rng, 5, 10);

  let targetInts = [];
  if (targetSchools) {
    targetInts = ints.filter(int => {
      const rL = int.pos[0] - GRID.BLOCK_SIZE / 2;
      const rR = int.pos[0] + GRID.BLOCK_SIZE / 2;
      const rT = int.pos[1] - GRID.BLOCK_SIZE / 2;
      const rB = int.pos[1] + GRID.BLOCK_SIZE / 2;
      return [
        getZoneAt(rL, rT), getZoneAt(rR, rT),
        getZoneAt(rL, rB), getZoneAt(rR, rB)
      ].includes('school');
    });
  }

  for (let step = 0; step < numSteps; step++) {
    // Determine lane offset based on incoming direction
    let offsetX = 0;
    let offsetZ = 0;
    if (prev) {
      if (current.row > prev.row) offsetX = -NPC_VEHICLE.LANE_OFFSET; // South => -X offset
      else if (current.row < prev.row) offsetX = NPC_VEHICLE.LANE_OFFSET; // North => +X offset
      else if (current.col > prev.col) offsetZ = NPC_VEHICLE.LANE_OFFSET; // East => +Z offset
      else if (current.col < prev.col) offsetZ = -NPC_VEHICLE.LANE_OFFSET; // West => -Z offset
    }

    // Push the lane-offset intersection center
    route.push([current.pos[0] + offsetX, current.pos[1] + offsetZ]);

    const neighbors = [];
    if (current.row > 0) neighbors.push(ints.find(i => i.row === current.row - 1 && i.col === current.col));
    if (current.row < 4) neighbors.push(ints.find(i => i.row === current.row + 1 && i.col === current.col));
    if (current.col > 0) neighbors.push(ints.find(i => i.row === current.row && i.col === current.col - 1));
    if (current.col < 4) neighbors.push(ints.find(i => i.row === current.row && i.col === current.col + 1));

    let validNeighbors = neighbors.filter(n => n && (!prev || n.row !== prev.row || n.col !== prev.col));
    if (validNeighbors.length === 0) validNeighbors = neighbors;

    prev = current;

    // Bias towards school grounds if asked
    if (targetSchools && targetInts.length > 0) {
      validNeighbors.sort((a, b) => {
        const distA = Math.min(...targetInts.map(ti => Math.abs(ti.row - a.row) + Math.abs(ti.col - a.col)));
        const distB = Math.min(...targetInts.map(ti => Math.abs(ti.row - b.row) + Math.abs(ti.col - b.col)));
        return distA - distB;
      });
      // 80% chance to pick best path toward school
      if (randBool(rng, 0.8)) {
        current = validNeighbors[0];
        continue;
      }
    }

    current = randPick(rng, validNeighbors);
  }

  return route;
}

/**
 * Clamp a value to keep entities within world bounds.
 * @param {number} v
 * @returns {number}
 */
function clampWorld(v) {
  const limit = WORLD_HALF - 2;
  return Math.max(-limit, Math.min(limit, v));
}

/**
 * Find the nearest intersection [x, z] to a given world position.
 * @param {number} x
 * @param {number} z
 * @returns {number[]} [ix, iz]
 */
function nearestIntersection(x, z) {
  const ints = allIntersections();
  let best = ints[0].pos;
  let bestDist = Infinity;
  for (const { pos } of ints) {
    const dx = pos[0] - x;
    const dz = pos[1] - z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      best = pos;
    }
  }
  return best;
}

/** Check if a position is too close to the player's starting position. */
const PLAYER_EXCLUSION_SQ = 15 * 15;
function tooCloseToPlayer(x, z) {
  const dx = x - VEHICLE_START.POSITION[0];
  const dz = z - VEHICLE_START.POSITION[2];
  return dx * dx + dz * dz < PLAYER_EXCLUSION_SQ;
}

// ---- Spawn functions ----

/**
 * Spawn pedestrians on random sidewalks.
 * @param {Function} rng
 * @param {Array} segments  worldData.roads.segments
 * @returns {Array} entities
 */
function spawnPedestrians(rng, segments) {
  const entities = [];

  for (let i = 0; i < ENTITY_COUNTS.PEDESTRIANS; i++) {
    const seg = randPick(rng, segments);
    const isHoriz = seg.orientation === 'horizontal';
    const roadAxis = isHoriz ? 'ew' : 'ns';

    // Pick a side: +1 or -1 for sidewalk offset
    const side = randBool(rng) ? 1 : -1;
    const offset = side * PEDESTRIAN.SIDEWALK_OFFSET;

    // Random position along the segment length
    const t = randRange(rng, -seg.length / 2 + 2, seg.length / 2 - 2);

    let x, z;
    if (isHoriz) {
      x = seg.center[0] + t;
      z = seg.center[2] + offset;
    } else {
      x = seg.center[0] + offset;
      z = seg.center[2] + t;
    }

    if (tooCloseToPlayer(x, z)) continue;

    const direction = randBool(rng) ? 1 : -1;
    const isJaywalker = randBool(rng, 0.1); // 10% jaywalkers
    const intPos = nearestIntersection(x, z);

    entities.push({
      id: uid(),
      type: 'pedestrian',
      subtype: null,
      position: [x, 0, z],
      heading: isHoriz ? (direction > 0 ? 0 : Math.PI) : (direction > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: PEDESTRIAN.WALK_SPEED,
      behaviorState: isJaywalker ? 'jaywalking' : 'walking',
      behaviorTimer: isJaywalker ? randRange(rng, 3, 10) : 0,
      stateData: {
        roadAxis,
        direction,
        crossDirection: randBool(rng) ? 1 : -1,
        crossDistance: 0,
        nearestIntersectionPos: intPos,
        waitTimer: 0,
      },
      route: [],
      routeIndex: 0,
      triggered: false,
      triggerPosition: null,
      thermalTemp: PEDESTRIAN.THERMAL_TEMP,
      soundType: PEDESTRIAN.SOUND_TYPE,
      soundIntensity: PEDESTRIAN.SOUND_INTENSITY,
      sensorClass: PEDESTRIAN.SENSOR_CLASS,
      bounds: {
        hw: PEDESTRIAN.BODY_RADIUS,
        hd: PEDESTRIAN.BODY_RADIUS,
        h: PEDESTRIAN.BODY_HEIGHT + PEDESTRIAN.HEAD_RADIUS * 2,
      },
      collisionRadius: PEDESTRIAN.COLLISION_RADIUS,
      visible: true,
      color: randPick(rng, PEDESTRIAN.COLORS),
    });
  }

  return entities;
}

/**
 * Spawn parked NPC vehicles in parking shoulders.
 * @param {Function} rng
 * @param {Array} segments  worldData.roads.segments
 * @returns {Array} entities
 */
function spawnParkedVehicles(rng, segments) {
  const entities = [];
  const usedPositions = [];

  for (let i = 0; i < ENTITY_COUNTS.NPC_VEHICLES_PARKED; i++) {
    // Try to find a non-overlapping position
    let attempts = 0;
    let x, z, heading;

    do {
      const seg = randPick(rng, segments);
      const isHoriz = seg.orientation === 'horizontal';
      const side = randBool(rng) ? 1 : -1;
      const offset = side * NPC_VEHICLE.PARKING_OFFSET;
      const t = randRange(rng, -seg.length / 2 + 3, seg.length / 2 - 3);

      if (isHoriz) {
        x = seg.center[0] + t;
        z = seg.center[2] + offset;
        heading = side > 0 ? -Math.PI / 2 : Math.PI / 2; // East/West
      } else {
        x = seg.center[0] + offset;
        z = seg.center[2] + t;
        heading = side > 0 ? 0 : Math.PI; // North/South
      }

      attempts++;
    } while (
      attempts < 20 &&
      (tooCloseToPlayer(x, z) ||
        usedPositions.some(([ux, uz]) => Math.abs(ux - x) < 5 && Math.abs(uz - z) < 3))
    );

    usedPositions.push([x, z]);

    entities.push({
      id: uid(),
      type: 'npcVehicle',
      subtype: 'parked',
      position: [x, 0, z],
      heading,
      speed: 0,
      behaviorState: 'parked',
      behaviorTimer: 0,
      stateData: {},
      route: [],
      routeIndex: 0,
      triggered: false,
      triggerPosition: null,
      thermalTemp: NPC_VEHICLE.THERMAL_TEMP_PARKED,
      soundType: NPC_VEHICLE.SOUND_TYPE,
      soundIntensity: NPC_VEHICLE.SOUND_INTENSITY_PARKED,
      sensorClass: NPC_VEHICLE.SENSOR_CLASS,
      bounds: {
        hw: NPC_VEHICLE.BODY_WIDTH / 2,
        hd: NPC_VEHICLE.BODY_LENGTH / 2,
        h: NPC_VEHICLE.BODY_HEIGHT,
      },
      collisionRadius: Math.max(NPC_VEHICLE.COLLISION_HW, NPC_VEHICLE.COLLISION_HL),
      visible: true,
      color: randPick(rng, NPC_VEHICLE.PARKED_COLORS),
    });
  }

  return entities;
}

/**
 * Spawn moving NPC vehicles in driving lanes with routes.
 * @param {Function} rng
 * @param {Array} segments
 * @returns {Array} entities
 */
function spawnMovingVehicles(rng, segments) {
  const entities = [];

  for (let i = 0; i < ENTITY_COUNTS.NPC_VEHICLES_MOVING; i++) {
    const seg = randPick(rng, segments);
    const isHoriz = seg.orientation === 'horizontal';
    const side = randBool(rng) ? 1 : -1;
    const offset = side * NPC_VEHICLE.LANE_OFFSET;
    const t = randRange(rng, -seg.length / 2 + 5, seg.length / 2 - 5);

    let x, z, heading;
    if (isHoriz) {
      x = seg.center[0] + t;
      z = seg.center[2] + offset;
      heading = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      x = seg.center[0] + offset;
      z = seg.center[2] + t;
      heading = side > 0 ? 0 : Math.PI;
    }

    if (tooCloseToPlayer(x, z)) continue;

    const startXZ = [x, z];
    const route = buildGridRoute(rng, startXZ);

    entities.push({
      id: uid('npc'),
      type: 'npcVehicle',
      subtype: 'moving',
      position: [x, 0, z],
      heading,
      speed: NPC_VEHICLE.DRIVE_SPEED,
      behaviorState: 'driving',
      behaviorTimer: 0,
      stateData: {
        routeDirection: 1, // 1 = forward through route, -1 = reverse
      },
      route,
      routeIndex: 0,
      triggered: false,
      triggerPosition: null,
      thermalTemp: NPC_VEHICLE.THERMAL_TEMP_MOVING,
      soundType: NPC_VEHICLE.SOUND_TYPE,
      soundIntensity: NPC_VEHICLE.SOUND_INTENSITY_MOVING,
      sensorClass: NPC_VEHICLE.SENSOR_CLASS,
      bounds: {
        hw: NPC_VEHICLE.BODY_WIDTH / 2,
        hd: NPC_VEHICLE.BODY_LENGTH / 2,
        h: NPC_VEHICLE.BODY_HEIGHT,
      },
      collisionRadius: Math.max(NPC_VEHICLE.COLLISION_HW, NPC_VEHICLE.COLLISION_HL),
      visible: true,
      color: randPick(rng, NPC_VEHICLE.COLORS),
    });
  }

  return entities;
}

/**
 * Spawn school buses targeting school zones.
 */
function spawnSchoolBuses(rng, segments) {
  const entities = [];
  const count = ENTITY_COUNTS.SCHOOL_BUSES || 1;

  for (let i = 0; i < count; i++) {
    const seg = randPick(rng, segments);
    const isHoriz = seg.orientation === 'horizontal';
    const side = randBool(rng) ? 1 : -1;
    const offset = side * NPC_VEHICLE.LANE_OFFSET;
    const t = randRange(rng, -seg.length / 4, seg.length / 4);

    let x, z, heading;
    if (isHoriz) {
      x = seg.center[0] + t;
      z = seg.center[2] + offset;
      heading = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      x = seg.center[0] + offset;
      z = seg.center[2] + t;
      heading = side > 0 ? 0 : Math.PI;
    }

    if (tooCloseToPlayer(x, z)) continue;

    const startXZ = [x, z];
    const route = buildGridRoute(rng, startXZ, true);

    entities.push({
      id: uid('bus'),
      type: 'schoolbus',
      subtype: 'moving',
      position: [x, 0, z],
      heading,
      speed: SCHOOL_BUS.DRIVE_SPEED,
      behaviorState: 'driving',
      behaviorTimer: 0,
      stateData: { routeDirection: 1 },
      route,
      routeIndex: 0,
      triggered: false,
      triggerPosition: null,
      thermalTemp: SCHOOL_BUS.THERMAL_TEMP,
      soundType: SCHOOL_BUS.SOUND_TYPE,
      soundIntensity: SCHOOL_BUS.SOUND_INTENSITY,
      sensorClass: SCHOOL_BUS.SENSOR_CLASS,
      bounds: {
        hw: SCHOOL_BUS.BODY_WIDTH / 2,
        hd: SCHOOL_BUS.BODY_LENGTH / 2,
        h: SCHOOL_BUS.BODY_HEIGHT,
      },
      collisionRadius: Math.max(SCHOOL_BUS.COLLISION_HW, SCHOOL_BUS.COLLISION_HL),
      visible: true,
      color: SCHOOL_BUS.COLOR || "#FFCC00",
    });
  }

  return entities;
}

/**
 * Spawn the emergency vehicle on a perimeter road with a route
 * through interior intersections.
 * @param {Function} rng
 * @returns {Array} entities (length 1)
 */
function spawnEmergencyVehicle(rng) {
  // Start on a perimeter road (row 0 or col 0)
  const perimeterInts = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 0 || r === 4 || c === 0 || c === 4) {
        const [x, , z] = getIntersectionCenter(r, c);
        perimeterInts.push([x, z]);
      }
    }
  }

  const start = randPick(rng, perimeterInts);

  // Build a route through interior intersections
  const route = buildGridRoute(rng, start);

  // Determine initial heading toward first route waypoint
  let heading = 0;
  if (route.length > 0) {
    const dx = route[0][0] - start[0];
    const dz = route[0][1] - start[1];
    heading = Math.atan2(-dx, -dz);
  }

  return [{
    id: uid('emer'),
    type: 'emergency',
    subtype: 'ambulance',
    position: [start[0], 0, start[1]],
    heading,
    speed: EMERGENCY.DRIVE_SPEED,
    behaviorState: 'driving',
    behaviorTimer: 0,
    stateData: {
      routeDirection: 1,
    },
    route,
    routeIndex: 0,
    triggered: false,
    triggerPosition: null,
    thermalTemp: EMERGENCY.THERMAL_TEMP,
    soundType: EMERGENCY.SOUND_TYPE,
    soundIntensity: EMERGENCY.SOUND_INTENSITY,
    sensorClass: EMERGENCY.SENSOR_CLASS,
    bounds: {
      hw: EMERGENCY.BODY_WIDTH / 2,
      hd: EMERGENCY.BODY_LENGTH / 2,
      h: EMERGENCY.BODY_HEIGHT,
    },
    collisionRadius: Math.max(EMERGENCY.COLLISION_HW, EMERGENCY.COLLISION_HL),
    visible: true,
    color: EMERGENCY.BODY_COLOR,
    flashState: false,
    flashTimer: 0,
  }];
}

/**
 * Spawn animals: 2 dogs near residential sidewalks, 1 deer near perimeter.
 * @param {Function} rng
 * @param {Array} segments
 * @returns {Array} entities
 */
function spawnAnimals(rng, segments) {
  const entities = [];

  // Filter residential sidewalk segments
  const residentialSegs = segments.filter((seg) => {
    const zone = getZoneAt(seg.center[0], seg.center[2]);
    return zone === 'residential';
  });

  // Filter perimeter segments (on edge roads)
  const perimeterSegs = segments.filter((seg) => {
    const x = seg.center[0];
    const z = seg.center[2];
    return Math.abs(x) > WORLD_HALF - 20 || Math.abs(z) > WORLD_HALF - 20;
  });

  // 2 dogs near residential areas
  for (let i = 0; i < 2; i++) {
    const seg = residentialSegs.length > 0 ? randPick(rng, residentialSegs) : randPick(rng, segments);
    const isHoriz = seg.orientation === 'horizontal';
    const side = randBool(rng) ? 1 : -1;
    const offset = side * PEDESTRIAN.SIDEWALK_OFFSET;
    const t = randRange(rng, -seg.length / 2 + 2, seg.length / 2 - 2);

    const x = isHoriz ? seg.center[0] + t : seg.center[0] + offset;
    const z = isHoriz ? seg.center[2] + offset : seg.center[2] + t;

    if (tooCloseToPlayer(x, z)) continue;

    const wanderDir = randRange(rng, 0, Math.PI * 2);

    entities.push({
      id: uid('dog'),
      type: 'animal',
      subtype: 'dog',
      position: [x, 0, z],
      heading: wanderDir,
      speed: ANIMAL.DOG.SPEED,
      behaviorState: 'wandering',
      behaviorTimer: randRange(rng, ANIMAL.WANDER_TIME_MIN, ANIMAL.WANDER_TIME_MAX),
      stateData: {
        direction: wanderDir,
        species: 'dog',
        baseSpeed: ANIMAL.DOG.SPEED,
        dartSpeed: ANIMAL.DOG.DART_SPEED,
        dartDistance: 0,
        homeX: x,
        homeZ: z,
      },
      route: [],
      routeIndex: 0,
      triggered: false,
      triggerPosition: null,
      thermalTemp: ANIMAL.THERMAL_TEMP,
      soundType: ANIMAL.SOUND_TYPE,
      soundIntensity: ANIMAL.SOUND_INTENSITY,
      sensorClass: ANIMAL.SENSOR_CLASS,
      bounds: {
        hw: ANIMAL.DOG.WIDTH / 2,
        hd: ANIMAL.DOG.LENGTH / 2,
        h: ANIMAL.DOG.HEIGHT,
      },
      collisionRadius: ANIMAL.COLLISION_RADIUS,
      visible: true,
      color: ANIMAL.DOG.COLOR,
    });
  }

  // 1 deer near perimeter
  {
    const seg = perimeterSegs.length > 0 ? randPick(rng, perimeterSegs) : randPick(rng, segments);
    const isHoriz = seg.orientation === 'horizontal';
    const side = randBool(rng) ? 1 : -1;
    const offset = side * PEDESTRIAN.SIDEWALK_OFFSET;
    const t = randRange(rng, -seg.length / 2 + 2, seg.length / 2 - 2);

    const x = isHoriz ? seg.center[0] + t : seg.center[0] + offset;
    const z = isHoriz ? seg.center[2] + offset : seg.center[2] + t;

    if (!tooCloseToPlayer(x, z)) {
      const wanderDir = randRange(rng, 0, Math.PI * 2);

      entities.push({
        id: uid('deer'),
        type: 'animal',
        subtype: 'deer',
        position: [x, 0, z],
        heading: wanderDir,
        speed: ANIMAL.DEER.SPEED,
        behaviorState: 'wandering',
        behaviorTimer: randRange(rng, ANIMAL.WANDER_TIME_MIN, ANIMAL.WANDER_TIME_MAX),
        stateData: {
          direction: wanderDir,
          species: 'deer',
          baseSpeed: ANIMAL.DEER.SPEED,
          dartSpeed: ANIMAL.DEER.DART_SPEED,
          dartDistance: 0,
          homeX: x,
          homeZ: z,
        },
        route: [],
        routeIndex: 0,
        triggered: false,
        triggerPosition: null,
        thermalTemp: ANIMAL.THERMAL_TEMP,
        soundType: ANIMAL.SOUND_TYPE,
        soundIntensity: ANIMAL.SOUND_INTENSITY,
        sensorClass: ANIMAL.SENSOR_CLASS,
        bounds: {
          hw: ANIMAL.DEER.WIDTH / 2,
          hd: ANIMAL.DEER.LENGTH / 2,
          h: ANIMAL.DEER.HEIGHT,
        },
        collisionRadius: ANIMAL.COLLISION_RADIUS,
        visible: true,
        color: ANIMAL.DEER.COLOR,
      });
    }
  }

  return entities;
}

/**
 * Spawn ball triggers near parked vehicles in residential zones.
 * @param {Function} rng
 * @param {Array} parkedVehicles  already-spawned parked vehicle entities
 * @returns {Array} entities
 */
function spawnBallTriggers(rng, parkedVehicles) {
  const entities = [];

  // Filter parked vehicles in residential zones
  const residentialParked = parkedVehicles.filter((v) => {
    const zone = getZoneAt(v.position[0], v.position[2]);
    return zone === 'residential';
  });

  const pool = residentialParked.length >= 2 ? residentialParked : parkedVehicles;

  for (let i = 0; i < ENTITY_COUNTS.BALL_TRIGGERS; i++) {
    const vehicle = pool[i % pool.length];
    // Place ball 2-3m beside the parked vehicle
    const offsetX = randRange(rng, -3, 3);
    const offsetZ = randRange(rng, -3, 3);

    const x = clampWorld(vehicle.position[0] + offsetX);
    const z = clampWorld(vehicle.position[2] + offsetZ);

    // Determine roll direction — perpendicular to the road the vehicle is parked on
    // Use heading to figure out road orientation: heading ~0 or ~PI => EW road, else NS
    const absH = Math.abs(vehicle.heading);
    const isEWRoad = absH < Math.PI / 4 || absH > (3 * Math.PI / 4);
    const rollHeading = isEWRoad
      ? (randBool(rng) ? Math.PI / 2 : -Math.PI / 2)  // roll north/south across EW road
      : (randBool(rng) ? 0 : Math.PI);                  // roll east/west across NS road

    entities.push({
      id: uid('ball'),
      type: 'ball',
      subtype: null,
      position: [x, 0, z],
      heading: rollHeading,
      speed: 0,
      behaviorState: 'hidden',
      behaviorTimer: 0,
      stateData: {
        rollHeading,
        rollDistance: 0,
      },
      route: [],
      routeIndex: 0,
      triggered: false,
      triggerPosition: null,
      thermalTemp: BALL.THERMAL_TEMP,
      soundType: BALL.SOUND_TYPE,
      soundIntensity: 0, // silent until rolling
      sensorClass: BALL.SENSOR_CLASS,
      bounds: {
        hw: BALL.RADIUS,
        hd: BALL.RADIUS,
        h: BALL.RADIUS * 2,
      },
      collisionRadius: BALL.COLLISION_RADIUS,
      visible: false, // hidden until triggered
      color: BALL.COLOR,
    });
  }

  return entities;
}

// ============================================================
// Public API
// ============================================================

/**
 * Spawn all world entities deterministically from a seed.
 *
 * @param {number|string} seed  - world generation seed
 * @param {object} worldData    - from generateWorld(), must have roads.segments
 * @returns {Array} flat array of entity objects
 */
export function spawnEntities(seed, worldData) {
  _nextId = 0;
  const rng = createRng(seed + 5000);
  const segments = worldData.roads.segments;

  const pedestrians = spawnPedestrians(rng, segments);
  const parked = spawnParkedVehicles(rng, segments);
  const moving = spawnMovingVehicles(rng, segments);
  const schoolbuses = spawnSchoolBuses(rng, segments);
  const emergency = spawnEmergencyVehicle(rng);
  const animals = spawnAnimals(rng, segments);
  const balls = spawnBallTriggers(rng, parked);

  return [
    ...pedestrians,
    ...parked,
    ...moving,
    ...schoolbuses,
    ...emergency,
    ...animals,
    ...balls,
  ];
}

/**
 * Advance all entity behaviours by one simulation step.
 *
 * @param {Array} entities        - current entity array
 * @param {number} delta          - seconds since last frame
 * @param {object} trafficState   - object with getLightState(axis) method
 * @param {number[]} playerPosition - player vehicle [x, y, z]
 * @returns {Array} updated entity array
 */
export function tickEntities(entities, delta, trafficState, playerPosition) {
  // Cap delta to avoid physics explosions on tab-switch
  const dt = Math.min(delta, 0.1);

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];

    switch (e.type) {
      case 'pedestrian':
        entities[i] = tickPedestrian(e, dt, trafficState);
        break;
      case 'npcVehicle':
      case 'schoolbus':
        entities[i] = tickNpcVehicle(e, dt, trafficState, playerPosition);
        break;
      case 'animal':
        entities[i] = tickAnimal(e, dt);
        break;
      case 'emergency':
        entities[i] = tickEmergency(e, dt);
        break;
      case 'ball':
        entities[i] = tickBall(e, dt, playerPosition);
        break;
      default:
        break;
    }
  }

  return entities;
}
