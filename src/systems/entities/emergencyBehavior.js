// ============================================================
// Emergency Vehicle Behavior — Always-driving vehicle
// Similar to NPC vehicle but ignores traffic lights and uses
// EMERGENCY.DRIVE_SPEED. Toggles flashState for siren lights.
// ============================================================

import { EMERGENCY } from '../../constants/entities.js';
import { WORLD_HALF } from '../../constants/world.js';

const BOUNDARY = WORLD_HALF - 2;
const WAYPOINT_REACH = 3;         // m — distance to consider waypoint reached
const HEADING_TOLERANCE = 0.15;   // radians
const TURN_RATE = 2.0;            // radians/s — emergency turns faster
const ACCEL_RATE = 6.0;           // m/s^2

/**
 * Advance the emergency vehicle entity by one simulation step.
 * Always drives through intersections (ignores traffic lights).
 * Toggles flashState every FLASH_INTERVAL seconds.
 *
 * @param {object} entity - emergency entity
 * @param {number} delta  - seconds since last frame
 * @returns {object} mutated entity
 */
export function tickEmergency(entity, delta) {
  // ---- Flash/siren toggle ----
  entity.flashTimer += delta;
  if (entity.flashTimer >= EMERGENCY.FLASH_INTERVAL) {
    entity.flashTimer -= EMERGENCY.FLASH_INTERVAL;
    entity.flashState = !entity.flashState;
  }

  // ---- Driving logic ----
  switch (entity.behaviorState) {
    case 'driving':
      return drivingTick(entity, delta);
    case 'turning':
      return turningTick(entity, delta);
    default:
      // Fallback — always drive
      entity.behaviorState = 'driving';
      return drivingTick(entity, delta);
  }
}

// ---- State tick functions ----

/**
 * Driving: move forward at EMERGENCY.DRIVE_SPEED, follow route.
 * No traffic light checks — emergency vehicle has right-of-way.
 */
function drivingTick(entity, delta) {
  const { route, stateData } = entity;
  const targetSpeed = EMERGENCY.DRIVE_SPEED;

  // Accelerate to target speed
  if (entity.speed < targetSpeed) {
    entity.speed = Math.min(targetSpeed, entity.speed + ACCEL_RATE * delta);
  }

  // Move forward
  entity.position[0] += -Math.sin(entity.heading) * entity.speed * delta;
  entity.position[2] += -Math.cos(entity.heading) * entity.speed * delta;

  // Boundary wrapping
  if (Math.abs(entity.position[0]) > BOUNDARY) {
    entity.position[0] = -Math.sign(entity.position[0]) * (BOUNDARY - 5);
  }
  if (Math.abs(entity.position[2]) > BOUNDARY) {
    entity.position[2] = -Math.sign(entity.position[2]) * (BOUNDARY - 5);
  }

  // Route following
  if (route.length > 0) {
    const target = route[entity.routeIndex];
    if (target) {
      const dx = target[0] - entity.position[0];
      const dz = target[1] - entity.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < WAYPOINT_REACH) {
        // Advance to next waypoint
        advanceRoute(entity);

        const nextTarget = route[entity.routeIndex];
        if (nextTarget) {
          const ndx = nextTarget[0] - entity.position[0];
          const ndz = nextTarget[1] - entity.position[2];
          const targetHeading = Math.atan2(-ndx, -ndz);
          const headingDiff = normalizeAngle(targetHeading - entity.heading);

          if (Math.abs(headingDiff) > HEADING_TOLERANCE) {
            entity.behaviorState = 'turning';
            stateData.targetHeading = targetHeading;
            return entity;
          }
        }
      } else {
        // Gentle steering toward current target
        const targetHeading = Math.atan2(-dx, -dz);
        const headingDiff = normalizeAngle(targetHeading - entity.heading);
        const maxSteer = TURN_RATE * 0.3 * delta;
        entity.heading += Math.max(-maxSteer, Math.min(maxSteer, headingDiff));
      }
    }
  }

  return entity;
}

/**
 * Turning: rotate heading toward target, then resume driving.
 * Emergency vehicle maintains higher speed through turns.
 */
function turningTick(entity, delta) {
  const { stateData } = entity;
  const targetHeading = stateData.targetHeading;

  // Slow down slightly during turn but stay fast
  entity.speed = Math.max(
    EMERGENCY.DRIVE_SPEED * 0.5,
    entity.speed - ACCEL_RATE * 0.3 * delta
  );

  // Rotate toward target heading
  const diff = normalizeAngle(targetHeading - entity.heading);
  const step = TURN_RATE * delta;

  if (Math.abs(diff) < step || Math.abs(diff) < HEADING_TOLERANCE) {
    entity.heading = targetHeading;
    entity.behaviorState = 'driving';
  } else {
    entity.heading += Math.sign(diff) * step;
  }

  // Keep moving through the turn
  entity.position[0] += -Math.sin(entity.heading) * entity.speed * delta;
  entity.position[2] += -Math.cos(entity.heading) * entity.speed * delta;

  // Boundary wrapping
  if (Math.abs(entity.position[0]) > BOUNDARY) {
    entity.position[0] = -Math.sign(entity.position[0]) * (BOUNDARY - 5);
  }
  if (Math.abs(entity.position[2]) > BOUNDARY) {
    entity.position[2] = -Math.sign(entity.position[2]) * (BOUNDARY - 5);
  }

  return entity;
}

// ---- Utilities ----

/**
 * Normalize an angle to [-PI, PI].
 * @param {number} a
 * @returns {number}
 */
function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Advance route index, reversing direction at endpoints.
 * @param {object} entity
 */
function advanceRoute(entity) {
  const { route, stateData } = entity;
  if (route.length === 0) return;

  const dir = stateData.routeDirection || 1;
  entity.routeIndex += dir;

  if (entity.routeIndex >= route.length) {
    entity.routeIndex = route.length - 2;
    stateData.routeDirection = -1;
  } else if (entity.routeIndex < 0) {
    entity.routeIndex = 1;
    stateData.routeDirection = 1;
  }

  entity.routeIndex = Math.max(0, Math.min(route.length - 1, entity.routeIndex));
}
