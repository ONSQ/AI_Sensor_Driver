// ============================================================
// NPC Vehicle Behavior — State machine for NPC vehicle entities
// States: parked, driving, stopping, stopped, turning
// ============================================================

import { NPC_VEHICLE } from '../../constants/entities.js';
import { GRID, WORLD_HALF } from '../../constants/world.js';

const BOUNDARY = WORLD_HALF - 2;
const WAYPOINT_REACH = 3;         // m — distance to consider waypoint reached
const HEADING_TOLERANCE = 0.15;   // radians — close enough to target heading
const TURN_RATE = 1.5;            // radians/s — how fast the vehicle turns
const DECEL_RATE = 8.0;           // m/s^2 — braking deceleration
const ACCEL_RATE = 4.0;           // m/s^2 — acceleration from stop

/**
 * Advance an NPC vehicle entity by one simulation step.
 *
 * @param {object} entity       - npcVehicle entity
 * @param {number} delta        - seconds since last frame
 * @param {object} trafficState - { getLightState(axis) }
 * @param {number[]} playerPosition - [x, y, z]
 * @returns {object} mutated entity
 */
export function tickNpcVehicle(entity, delta, trafficState, playerPosition) {
  // Parked vehicles never move
  if (entity.subtype === 'parked' || entity.behaviorState === 'parked') {
    return entity;
  }

  switch (entity.behaviorState) {
    case 'driving':
      return drivingTick(entity, delta, trafficState, playerPosition);
    case 'stopping':
      return stoppingTick(entity, delta, trafficState, playerPosition);
    case 'stopped':
      return stoppedTick(entity, delta, trafficState);
    case 'turning':
      return turningTick(entity, delta);
    default:
      return entity;
  }
}

// ---- State tick functions ----

/**
 * Driving: move forward, follow route, check traffic lights.
 */
function drivingTick(entity, delta, trafficState) {
  const { route, stateData } = entity;

  // Accelerate to target speed
  if (entity.speed < NPC_VEHICLE.DRIVE_SPEED) {
    entity.speed = Math.min(
      NPC_VEHICLE.DRIVE_SPEED,
      entity.speed + ACCEL_RATE * delta
    );
  }

  // Move forward: position += forward * speed * delta
  // Forward direction: -sin(heading) on X, -cos(heading) on Z
  const moveX = -Math.sin(entity.heading) * entity.speed * delta;
  const moveZ = -Math.cos(entity.heading) * entity.speed * delta;
  entity.position[0] += moveX;
  entity.position[2] += moveZ;

  // Boundary wrapping — if out of bounds, warp to opposite side
  if (Math.abs(entity.position[0]) > BOUNDARY) {
    entity.position[0] = -Math.sign(entity.position[0]) * (BOUNDARY - 5);
  }
  if (Math.abs(entity.position[2]) > BOUNDARY) {
    entity.position[2] = -Math.sign(entity.position[2]) * (BOUNDARY - 5);
  }

  // Route following — check if near current waypoint
  if (route.length > 0) {
    const target = route[entity.routeIndex];
    if (target) {
      const dx = target[0] - entity.position[0];
      const dz = target[1] - entity.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < WAYPOINT_REACH) {
        // Advance to next waypoint
        advanceRoute(entity);

        // Start turning toward next waypoint
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
        // Steer gently toward target while driving
        const targetHeading = Math.atan2(-dx, -dz);
        const headingDiff = normalizeAngle(targetHeading - entity.heading);
        const maxSteer = TURN_RATE * 0.3 * delta; // gentle steering
        entity.heading += Math.max(-maxSteer, Math.min(maxSteer, headingDiff));
      }
    }
  }

  // Player Obstacle Avoidance
  if (playerPosition) {
    const dxP = playerPosition[0] - entity.position[0];
    const dzP = playerPosition[2] - entity.position[2];
    const distSq = dxP * dxP + dzP * dzP;

    // Check if player is close (within 15m)
    if (distSq < 15 * 15) {
      // Check if player is in front of the NPC
      const fwdXP = -Math.sin(entity.heading);
      const fwdZP = -Math.cos(entity.heading);
      const dotP = dxP * fwdXP + dzP * fwdZP;

      // If dot > 0, player is in front. If dot > distance*0.7, player is roughly directly in front.
      if (dotP > 0) {
        const distP = Math.sqrt(distSq);
        if (dotP > distP * 0.8) {
          entity.behaviorState = 'stopping';
          return entity;
        }
      }
    }
  }

  // Traffic light and stop sign check — when approaching an intersection
  const lightCheck = checkTrafficLight(entity, trafficState);
  if (lightCheck.shouldStop) {
    entity.behaviorState = 'stopping';
    return entity;
  }

  return entity;
}

/**
 * Stopping: decelerate to 0.
 */
function stoppingTick(entity, delta, trafficState, playerPosition) {
  entity.speed = Math.max(0, entity.speed - DECEL_RATE * delta);

  // Still move while decelerating
  if (entity.speed > 0) {
    entity.position[0] += -Math.sin(entity.heading) * entity.speed * delta;
    entity.position[2] += -Math.cos(entity.heading) * entity.speed * delta;
  }

  if (entity.speed <= 0) {
    entity.speed = 0;

    // If stopped at a stop sign, mark it so we can proceed
    const lightCheck = checkTrafficLight(entity, trafficState);
    if (lightCheck.isStopSign) {
      if (!entity.stateData.stopSignWaitTimer) {
        entity.stateData.stopSignWaitTimer = 0;
      }
      entity.behaviorState = 'stopped';
      return entity;
    }

    entity.behaviorState = 'stopped';
  }

  return entity;
}

/**
 * Stopped: wait for green light or for stop sign timer.
 */
function stoppedTick(entity, delta, trafficState) {
  entity.speed = 0;

  const lightCheck = checkTrafficLight(entity, trafficState);
  if (lightCheck.isStopSign) {
    entity.stateData.stopSignWaitTimer += delta;
    if (entity.stateData.stopSignWaitTimer > 2.0) { // wait 2 seconds
      entity.stateData.clearedStopSigns = entity.stateData.clearedStopSigns || {};
      entity.stateData.clearedStopSigns[lightCheck.intKey] = true;
      entity.behaviorState = 'driving';
      entity.stateData.stopSignWaitTimer = 0;
    }
  } else if (!lightCheck.shouldStop) {
    entity.behaviorState = 'driving';
  }

  return entity;
}

/**
 * Turning: smoothly rotate heading toward target, then resume driving.
 */
function turningTick(entity, delta) {
  const { stateData } = entity;
  const targetHeading = stateData.targetHeading;

  // Slow down during turn
  entity.speed = Math.max(NPC_VEHICLE.DRIVE_SPEED * 0.3, entity.speed - DECEL_RATE * 0.5 * delta);

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
 * @param {number} a  angle in radians
 * @returns {number}
 */
function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Advance route index, reversing direction if at end.
 * @param {object} entity
 */
function advanceRoute(entity) {
  const { route, stateData } = entity;
  if (route.length === 0) return;

  const dir = stateData.routeDirection || 1;
  entity.routeIndex += dir;

  // Reverse at route boundaries
  if (entity.routeIndex >= route.length) {
    entity.routeIndex = route.length - 2;
    stateData.routeDirection = -1;
  } else if (entity.routeIndex < 0) {
    entity.routeIndex = 1;
    stateData.routeDirection = 1;
  }

  // Clamp just in case
  entity.routeIndex = Math.max(0, Math.min(route.length - 1, entity.routeIndex));
}

/**
 * Check if this vehicle should stop for a traffic light.
 * Determines road axis from heading, checks relevant light.
 *
 * @param {object} entity
 * @param {object} trafficState
 * @returns {{ shouldStop: boolean }}
 */
function checkTrafficLight(entity, trafficState) {
  // Determine which axis we're on from heading
  // heading ~0 or ~PI => traveling along Z => on NS road => check 'ns'
  // heading ~PI/2 or ~-PI/2 => traveling along X => on EW road => check 'ew'
  const absHeading = Math.abs(normalizeAngle(entity.heading));
  const isNS = absHeading < Math.PI / 4 || absHeading > (3 * Math.PI / 4);
  const axis = isNS ? 'ns' : 'ew';

  // Find nearest intersection
  const x = entity.position[0];
  const z = entity.position[2];
  const halfRoad = GRID.ROAD_WIDTH / 2;
  const stride = GRID.BLOCK_STRIDE;

  const col = Math.round((x + WORLD_HALF - halfRoad) / stride);
  const row = Math.round((z + WORLD_HALF - halfRoad) / stride);
  const clampedRow = Math.max(0, Math.min(4, row));
  const clampedCol = Math.max(0, Math.min(4, col));

  // Only interior intersections (1-3) have traffic lights. Perimeters have stop signs.
  const isInterior = clampedRow >= 1 && clampedRow <= 3 && clampedCol >= 1 && clampedCol <= 3;
  const intKey = `${clampedRow},${clampedCol}`;

  const intX = -WORLD_HALF + halfRoad + clampedCol * stride;
  const intZ = -WORLD_HALF + halfRoad + clampedRow * stride;

  // Distance to intersection
  const dx = intX - x;
  const dz = intZ - z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Only check when within approach distance and not already past it
  if (dist > NPC_VEHICLE.APPROACH_DISTANCE || dist < NPC_VEHICLE.STOP_DISTANCE * 0.5) {
    return { shouldStop: false };
  }

  // Check if we're heading toward the intersection (dot product)
  const fwdX = -Math.sin(entity.heading);
  const fwdZ = -Math.cos(entity.heading);
  const dot = dx * fwdX + dz * fwdZ;

  if (dot < 0) {
    // Moving away from intersection
    return { shouldStop: false };
  }

  if (!isInterior) {
    // Stop sign logic
    const cleared = entity.stateData.clearedStopSigns || {};
    if (cleared[intKey]) {
      return { shouldStop: false, isStopSign: true, intKey };
    }
    return { shouldStop: true, isStopSign: true, intKey };
  }

  // Check light state
  const lightState = trafficState.getLightState(axis);
  if (lightState === 'red' || lightState === 'yellow') {
    return { shouldStop: true };
  }

  return { shouldStop: false };
}
