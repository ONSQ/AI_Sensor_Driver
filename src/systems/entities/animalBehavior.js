// ============================================================
// Animal Behavior — State machine for animal entities
// States: wandering, paused, darting
// Species: dog, deer (params stored in stateData)
// ============================================================

import { ANIMAL } from '../../constants/entities.js';
import { GRID, WORLD_HALF } from '../../constants/world.js';

const BOUNDARY = WORLD_HALF - 2;
const ROAD_WIDTH = GRID.ROAD_WIDTH; // 14m — dart distance

/**
 * Advance an animal entity by one simulation step.
 *
 * @param {object} entity - animal entity
 * @param {number} delta  - seconds since last frame
 * @returns {object} mutated entity
 */
export function tickAnimal(entity, delta) {
  switch (entity.behaviorState) {
    case 'wandering':
      return wanderingTick(entity, delta);
    case 'paused':
      return pausedTick(entity, delta);
    case 'darting':
      return dartingTick(entity, delta);
    default:
      return entity;
  }
}

// ---- State tick functions ----

/**
 * Wandering: move in stateData.direction at species speed.
 * Timer counts down. When expired, transition to paused.
 */
function wanderingTick(entity, delta) {
  const { stateData } = entity;
  const speed = stateData.baseSpeed;

  // Move in current wander direction
  const dir = stateData.direction; // angle in radians
  const dx = Math.cos(dir) * speed * delta;
  const dz = Math.sin(dir) * speed * delta;

  entity.position[0] += dx;
  entity.position[2] += dz;
  entity.heading = dir;
  entity.speed = speed;

  // Boundary check — bounce off edges
  if (entity.position[0] > BOUNDARY || entity.position[0] < -BOUNDARY) {
    entity.position[0] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[0]));
    stateData.direction = Math.PI - stateData.direction; // reflect X
  }
  if (entity.position[2] > BOUNDARY || entity.position[2] < -BOUNDARY) {
    entity.position[2] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[2]));
    stateData.direction = -stateData.direction; // reflect Z
  }

  // Timer countdown
  entity.behaviorTimer -= delta;
  if (entity.behaviorTimer <= 0) {
    entity.behaviorState = 'paused';
    entity.speed = 0;
    entity.behaviorTimer = randomInRange(ANIMAL.PAUSE_TIME_MIN, ANIMAL.PAUSE_TIME_MAX);
  }

  return entity;
}

/**
 * Paused: stand still. Timer counts down.
 * When expired: 5% chance to dart, else wander with new direction.
 */
function pausedTick(entity, delta) {
  entity.speed = 0;
  entity.behaviorTimer -= delta;

  if (entity.behaviorTimer <= 0) {
    // Chance to dart across road
    if (Math.random() < ANIMAL.DART_CHANCE) {
      entity.behaviorState = 'darting';
      entity.speed = entity.stateData.dartSpeed;

      // Dart perpendicular to nearest road
      // Use a simple heuristic: dart in the direction that is more perpendicular
      // to the entity's current wander direction
      const currentDir = entity.stateData.direction;
      const dartDir = currentDir + Math.PI / 2; // perpendicular
      entity.stateData.direction = dartDir;
      entity.stateData.dartDistance = 0;
      entity.heading = dartDir;
      entity.behaviorTimer = 0;
    } else {
      // Resume wandering with a new random direction
      entity.behaviorState = 'wandering';
      entity.stateData.direction = Math.random() * Math.PI * 2;
      entity.behaviorTimer = randomInRange(ANIMAL.WANDER_TIME_MIN, ANIMAL.WANDER_TIME_MAX);
      entity.speed = entity.stateData.baseSpeed;
    }
  }

  return entity;
}

/**
 * Darting: sprint perpendicular to nearest road across the road.
 * After crossing (distance > 14m), transition to paused.
 */
function dartingTick(entity, delta) {
  const { stateData } = entity;
  const speed = stateData.dartSpeed;
  const dir = stateData.direction;

  const dx = Math.cos(dir) * speed * delta;
  const dz = Math.sin(dir) * speed * delta;
  const moveDist = speed * delta;

  entity.position[0] += dx;
  entity.position[2] += dz;
  entity.heading = dir;
  entity.speed = speed;

  stateData.dartDistance += moveDist;

  // Boundary check — stop darting at edges
  if (entity.position[0] > BOUNDARY || entity.position[0] < -BOUNDARY) {
    entity.position[0] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[0]));
    finishDart(entity);
    return entity;
  }
  if (entity.position[2] > BOUNDARY || entity.position[2] < -BOUNDARY) {
    entity.position[2] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[2]));
    finishDart(entity);
    return entity;
  }

  // Done darting when distance > road width
  if (stateData.dartDistance >= ROAD_WIDTH) {
    finishDart(entity);
  }

  return entity;
}

// ---- Utilities ----

/**
 * Transition from darting to paused.
 * @param {object} entity
 */
function finishDart(entity) {
  entity.behaviorState = 'paused';
  entity.speed = 0;
  entity.stateData.dartDistance = 0;
  entity.behaviorTimer = randomInRange(ANIMAL.PAUSE_TIME_MIN, ANIMAL.PAUSE_TIME_MAX);
}

/**
 * Simple random range using Math.random (non-seeded, for runtime variety).
 * Acceptable here because animal pause/wander timers don't need to be
 * perfectly deterministic after spawn.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}
