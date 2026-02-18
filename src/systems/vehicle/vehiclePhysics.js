// ============================================================
// Vehicle Physics — Arcade driving model (pure function)
// tickVehiclePhysics(state, inputs, delta) -> newState
//
// Bicycle model: front axle steers, rear axle follows.
// No rigid body engine. Simple position/rotation integration.
// ============================================================

import { VEHICLE_PHYSICS as P, VEHICLE_DIMS } from '../../constants/vehicle.js';
import { GRID, ZONE_MAP, WORLD_HALF } from '../../constants/world.js';
import { SPEED_LIMITS } from '../../constants/traffic.js';

/**
 * Compute the forward direction vector from heading.
 * Three.js convention: heading is rotation.y
 * Local forward = (0, 0, -1) -> world = (-sin(h), 0, -cos(h))
 */
function forwardVector(heading) {
  return [-Math.sin(heading), 0, -Math.cos(heading)];
}

/**
 * Determine the effective zone for the vehicle based on world position.
 * Checks nearby blocks and returns the zone with the lowest speed limit
 * (most restrictive). Vehicles are usually on roads between blocks.
 */
function getEffectiveZone(x, z) {
  const startEdge = -WORLD_HALF + GRID.ROAD_WIDTH; // -95

  const relX = x - startEdge;
  const relZ = z - startEdge;

  // Determine nearest block row/col
  const col = Math.round(relX / GRID.BLOCK_STRIDE - 0.5);
  const row = Math.round(relZ / GRID.BLOCK_STRIDE - 0.5);

  // Gather adjacent zones (clamp to valid range)
  const zones = [];
  for (let dr = 0; dr <= 1; dr++) {
    for (let dc = 0; dc <= 1; dc++) {
      const r = Math.max(0, Math.min(GRID.BLOCKS_PER_SIDE - 1, row + dr));
      const c = Math.max(0, Math.min(GRID.BLOCKS_PER_SIDE - 1, col + dc));
      zones.push(ZONE_MAP[r][c]);
    }
  }

  // Return the zone with the lowest speed limit (most restrictive)
  let minSpeed = Infinity;
  let minZone = 'city';
  for (const zone of zones) {
    const limit = SPEED_LIMITS[zone] || 35;
    if (limit < minSpeed) {
      minSpeed = limit;
      minZone = zone;
    }
  }
  return minZone;
}

/**
 * Clamp position to world boundaries.
 */
function clampToWorld(x, z) {
  const margin = WORLD_HALF - 2;
  return [
    Math.max(-margin, Math.min(margin, x)),
    Math.max(-margin, Math.min(margin, z)),
  ];
}

/**
 * Determine gear display string.
 */
function getGear(speed, inputs) {
  if (Math.abs(speed) < 0.1 && !inputs.accelerate && !inputs.brake) return 'P';
  if (speed < -0.1) return 'R';
  return 'D';
}

/**
 * Main physics tick — pure function.
 *
 * @param {{position: number[], heading: number, speed: number, steerAngle: number}} state
 * @param {{accelerate: boolean, brake: boolean, steerLeft: boolean, steerRight: boolean}} inputs
 * @param {number} delta — seconds since last frame
 * @returns {object} Partial state update for the store
 */
export function tickVehiclePhysics(state, inputs, delta) {
  // Cap delta to prevent physics explosions on tab-switch
  const dt = Math.min(delta, 0.1);

  let { speed, heading, steerAngle } = state;
  const [px, py, pz] = state.position;

  // --- 1. Steering ---
  if (inputs.steerLeft) {
    steerAngle = Math.min(steerAngle + P.STEER_SPEED * dt, P.MAX_STEER_ANGLE);
  } else if (inputs.steerRight) {
    steerAngle = Math.max(steerAngle - P.STEER_SPEED * dt, -P.MAX_STEER_ANGLE);
  } else {
    // Auto-center steering
    if (steerAngle > 0) {
      steerAngle = Math.max(0, steerAngle - P.STEER_RETURN_SPEED * dt);
    } else if (steerAngle < 0) {
      steerAngle = Math.min(0, steerAngle + P.STEER_RETURN_SPEED * dt);
    }
  }

  // --- 2. Speed (acceleration / braking / friction) ---
  if (inputs.accelerate) {
    if (speed < 0) {
      // Pressing gas while in reverse = brake first
      speed = Math.min(0, speed + P.BRAKE_DECEL * dt);
    } else {
      speed = Math.min(P.MAX_SPEED, speed + P.ACCELERATION * dt);
    }
  } else if (inputs.brake) {
    if (speed > 0) {
      // Braking from forward
      speed = Math.max(0, speed - P.BRAKE_DECEL * dt);
    } else {
      // Reversing
      speed = Math.max(-P.REVERSE_MAX_SPEED, speed - P.ACCELERATION * 0.3 * dt);
    }
  } else {
    // No input — friction deceleration
    if (speed > 0) {
      speed = Math.max(0, speed - P.FRICTION_DECEL * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + P.FRICTION_DECEL * dt);
    }
  }

  // --- 3. Heading update (bicycle model) ---
  if (Math.abs(speed) > P.MIN_TURN_SPEED) {
    const turnRate = (speed * Math.tan(steerAngle)) / VEHICLE_DIMS.WHEELBASE;
    heading += turnRate * dt;
  }

  // Normalize heading to [-PI, PI]
  heading = ((heading % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (heading > Math.PI) heading -= 2 * Math.PI;

  // --- 4. Position update ---
  const [fwdX, , fwdZ] = forwardVector(heading);
  let newX = px + fwdX * speed * dt;
  let newZ = pz + fwdZ * speed * dt;

  // Clamp to world boundaries
  [newX, newZ] = clampToWorld(newX, newZ);

  // --- 5. Derived state ---
  const speedMph = Math.abs(speed) * P.MPS_TO_MPH;
  const currentZone = getEffectiveZone(newX, newZ);
  const gear = getGear(speed, inputs);

  return {
    position: [newX, py, newZ],
    heading,
    speed,
    steerAngle,
    speedMph,
    currentZone,
    gear,
  };
}
