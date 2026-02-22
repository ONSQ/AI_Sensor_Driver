// ============================================================
// Pedestrian Behavior — State machine for pedestrian entities
// States: walking, waiting, crossing, jaywalking
// ============================================================

import { PEDESTRIAN } from '../../constants/entities.js';
import { GRID, WORLD_HALF } from '../../constants/world.js';

const ROAD_WIDTH = GRID.ROAD_WIDTH;       // 14m
const BOUNDARY = WORLD_HALF - 2;          // keep entities inside world
const INTERSECTION_PROXIMITY = 7.5;       // m — how close to intersection to trigger wait (stand at crosswalk)
const MAX_WAIT_TIME = 30;                 // s — give up waiting after this

/**
 * Advance a pedestrian entity by one simulation step.
 *
 * @param {object} entity       - pedestrian entity
 * @param {number} delta        - seconds since last frame
 * @param {object} trafficState - { getLightState(axis) } from traffic store
 * @returns {object} mutated entity
 */
export function tickPedestrian(entity, delta, trafficState) {
  switch (entity.behaviorState) {
    case 'walking':
      return walkingTick(entity, delta);
    case 'waiting':
      return waitingTick(entity, delta, trafficState);
    case 'crossing':
      return crossingTick(entity, delta);
    case 'jaywalking':
      return jaywalkingTick(entity, delta);
    default:
      return entity;
  }
}

// ---- State tick functions ----

/**
 * Walking: move along road axis at WALK_SPEED.
 * Reverse direction at world boundary.
 * Transition to waiting near intersections.
 */
function walkingTick(entity, delta) {
  const { stateData } = entity;
  const speed = PEDESTRIAN.WALK_SPEED;
  const dist = speed * delta;

  // Move along the road axis
  if (stateData.roadAxis === 'ew') {
    // Walking east/west => move along X
    entity.position[0] += stateData.direction * dist;
    entity.heading = stateData.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    // Walking north/south => move along Z
    entity.position[2] += stateData.direction * dist;
    entity.heading = stateData.direction > 0 ? 0 : Math.PI;
  }

  entity.speed = speed;

  // Boundary check — reverse direction at edges
  if (entity.position[0] > BOUNDARY || entity.position[0] < -BOUNDARY) {
    entity.position[0] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[0]));
    stateData.direction *= -1;
  }
  if (entity.position[2] > BOUNDARY || entity.position[2] < -BOUNDARY) {
    entity.position[2] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[2]));
    stateData.direction *= -1;
  }

  // Check proximity to nearest intersection
  const intPos = stateData.nearestIntersectionPos;
  if (intPos) {
    const dx = entity.position[0] - intPos[0];
    const dz = entity.position[2] - intPos[1];

    // Check along movement axis
    let axialDist;
    if (stateData.roadAxis === 'ew') {
      axialDist = Math.abs(dx);
    } else {
      axialDist = Math.abs(dz);
    }

    // Only stop if walking TOWARD the intersection
    let movingToward = false;
    if (stateData.roadAxis === 'ew') {
      movingToward = (dx * stateData.direction) < 0;
    } else {
      movingToward = (dz * stateData.direction) < 0;
    }

    if (movingToward && axialDist < INTERSECTION_PROXIMITY) {
      entity.behaviorState = 'waiting';
      entity.speed = 0;
      stateData.waitTimer = 0;
      return entity;
    }
  }

  // Periodically update nearest intersection (every ~2 seconds of walking)
  updateNearestIntersection(entity);

  return entity;
}

/**
 * Waiting: check traffic light. If safe to cross, start crossing.
 * Pedestrians on EW sidewalks cross the NS axis (check 'ns' light).
 * Pedestrians on NS sidewalks cross the EW axis (check 'ew' light).
 * Safe = the axis they are crossing has a RED light (traffic stopped).
 */
function waitingTick(entity, delta, trafficState) {
  const { stateData } = entity;
  stateData.waitTimer += delta;
  entity.speed = 0;

  // Determine which light to check:
  // If on EW sidewalk, crossing goes N/S => check 'ns' light
  // If NS goes RED, NS traffic is stopped => safe for ped to cross NS road
  // But pedestrians on EW sidewalk are crossing the road perpendicular to them,
  // which is the NS-oriented road. They need NS traffic to be stopped (ns = red).
  const crossAxis = stateData.roadAxis === 'ew' ? 'ns' : 'ew';
  const lightState = trafficState.getLightState(crossAxis);

  if (lightState === 'red') {
    // Safe to cross — transition to crossing
    entity.behaviorState = 'crossing';
    entity.speed = PEDESTRIAN.CROSS_SPEED;
    stateData.crossDistance = 0;
    return entity;
  }

  // Give up after MAX_WAIT_TIME — reverse and keep walking
  if (stateData.waitTimer > MAX_WAIT_TIME) {
    stateData.direction *= -1;
    entity.behaviorState = 'walking';
    entity.speed = PEDESTRIAN.WALK_SPEED;
    return entity;
  }

  return entity;
}

/**
 * Crossing: move perpendicular to the road at CROSS_SPEED.
 * Total distance = ROAD_WIDTH (14m).
 * Once done, transition to walking on the other sidewalk.
 */
function crossingTick(entity, delta) {
  const { stateData } = entity;
  const speed = PEDESTRIAN.CROSS_SPEED;
  const dist = speed * delta;

  stateData.crossDistance += dist;
  entity.speed = speed;

  // Move perpendicular to road axis
  if (stateData.roadAxis === 'ew') {
    // On EW sidewalk => cross in Z direction (north/south)
    entity.position[2] += stateData.crossDirection * dist;
    entity.heading = stateData.crossDirection > 0 ? 0 : Math.PI;
  } else {
    // On NS sidewalk => cross in X direction (east/west)
    entity.position[0] += stateData.crossDirection * dist;
    entity.heading = stateData.crossDirection > 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  // Clamp to world bounds
  entity.position[0] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[0]));
  entity.position[2] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[2]));

  // Done crossing when distance >= ROAD_WIDTH
  if (stateData.crossDistance >= ROAD_WIDTH) {
    entity.behaviorState = 'walking';
    entity.speed = PEDESTRIAN.WALK_SPEED;
    stateData.crossDistance = 0;
    // Now on the opposite sidewalk, keep walking in original road direction
    // Switch crossDirection for next crossing
    stateData.crossDirection *= -1;
    // Update nearest intersection from new position
    updateNearestIntersection(entity);
  }

  return entity;
}

/**
 * Jaywalking: wait for timer to expire, then cross mid-block.
 * Similar to crossing but without waiting for traffic light.
 */
function jaywalkingTick(entity, delta) {
  const { stateData } = entity;

  // Phase 1: countdown timer (walking along sidewalk)
  if (entity.behaviorTimer > 0) {
    entity.behaviorTimer -= delta;
    // Walk normally while waiting
    const speed = PEDESTRIAN.WALK_SPEED;
    const dist = speed * delta;
    entity.speed = speed;

    if (stateData.roadAxis === 'ew') {
      entity.position[0] += stateData.direction * dist;
      entity.heading = stateData.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      entity.position[2] += stateData.direction * dist;
      entity.heading = stateData.direction > 0 ? 0 : Math.PI;
    }

    // Boundary check
    if (entity.position[0] > BOUNDARY || entity.position[0] < -BOUNDARY) {
      entity.position[0] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[0]));
      stateData.direction *= -1;
    }
    if (entity.position[2] > BOUNDARY || entity.position[2] < -BOUNDARY) {
      entity.position[2] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[2]));
      stateData.direction *= -1;
    }

    if (entity.behaviorTimer <= 0) {
      // Start jaywalking cross
      stateData.crossDistance = 0;
    }
    return entity;
  }

  // Phase 2: crossing (same as crossing state but no light check)
  const speed = PEDESTRIAN.CROSS_SPEED;
  const dist = speed * delta;
  stateData.crossDistance += dist;
  entity.speed = speed;

  if (stateData.roadAxis === 'ew') {
    entity.position[2] += stateData.crossDirection * dist;
    entity.heading = stateData.crossDirection > 0 ? 0 : Math.PI;
  } else {
    entity.position[0] += stateData.crossDirection * dist;
    entity.heading = stateData.crossDirection > 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  entity.position[0] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[0]));
  entity.position[2] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[2]));

  if (stateData.crossDistance >= ROAD_WIDTH) {
    // Done — switch to normal walking
    entity.behaviorState = 'walking';
    entity.speed = PEDESTRIAN.WALK_SPEED;
    stateData.crossDistance = 0;
    stateData.crossDirection *= -1;
    updateNearestIntersection(entity);
  }

  return entity;
}

// ---- Utilities ----

/**
 * Recalculate the nearest intersection to the entity's current position.
 * Uses the 5x5 intersection grid.
 */
function updateNearestIntersection(entity) {
  const x = entity.position[0];
  const z = entity.position[2];
  const halfRoad = GRID.ROAD_WIDTH / 2;
  const stride = GRID.BLOCK_STRIDE;

  // Find nearest intersection row/col
  const col = Math.round((x + WORLD_HALF - halfRoad) / stride);
  const row = Math.round((z + WORLD_HALF - halfRoad) / stride);
  const clampedRow = Math.max(0, Math.min(4, row));
  const clampedCol = Math.max(0, Math.min(4, col));

  const ix = -WORLD_HALF + halfRoad + clampedCol * stride;
  const iz = -WORLD_HALF + halfRoad + clampedRow * stride;

  entity.stateData.nearestIntersectionPos = [ix, iz];
}
