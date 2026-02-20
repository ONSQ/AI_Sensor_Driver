// ============================================================
// Ball Trigger Behavior — Proximity-triggered rolling ball hazard
// States: hidden, rolling, stopped
// Ball becomes visible when player is within TRIGGER_DISTANCE,
// then rolls across the road to create a sudden obstacle.
// ============================================================

import { BALL } from '../../constants/entities.js';
import { WORLD_HALF } from '../../constants/world.js';

const BOUNDARY = WORLD_HALF - 2;

/**
 * Advance a ball trigger entity by one simulation step.
 *
 * @param {object} entity          - ball entity
 * @param {number} delta           - seconds since last frame
 * @param {number[]} playerPosition - player vehicle [x, y, z]
 * @returns {object} mutated entity
 */
export function tickBall(entity, delta, playerPosition) {
  switch (entity.behaviorState) {
    case 'hidden':
      return hiddenTick(entity, playerPosition);
    case 'rolling':
      return rollingTick(entity, delta);
    case 'stopped':
      return entity; // no-op — static obstacle
    default:
      return entity;
  }
}

// ---- State tick functions ----

/**
 * Hidden: invisible, waiting for player proximity.
 * When player is within TRIGGER_DISTANCE, start rolling.
 */
function hiddenTick(entity, playerPosition) {
  if (!playerPosition) return entity;

  const dx = entity.position[0] - playerPosition[0];
  const dz = entity.position[2] - playerPosition[2];
  const distSq = dx * dx + dz * dz;

  if (distSq < BALL.TRIGGER_DISTANCE * BALL.TRIGGER_DISTANCE) {
    entity.behaviorState = 'rolling';
    entity.visible = true;
    entity.triggered = true;
    entity.triggerPosition = [...entity.position];
    entity.speed = BALL.ROLL_SPEED;
    entity.soundIntensity = BALL.SOUND_INTENSITY;
    entity.behaviorTimer = BALL.ROLL_DURATION;
    entity.stateData.rollDistance = 0;
  }

  return entity;
}

/**
 * Rolling: move perpendicular to road at ROLL_SPEED.
 * After ROLL_DURATION seconds, transition to stopped.
 */
function rollingTick(entity, delta) {
  const { stateData } = entity;
  const speed = BALL.ROLL_SPEED;
  const rollHeading = stateData.rollHeading;

  // Move in roll direction
  // rollHeading uses same convention: -sin(h) on X, -cos(h) on Z
  const moveX = -Math.sin(rollHeading) * speed * delta;
  const moveZ = -Math.cos(rollHeading) * speed * delta;

  entity.position[0] += moveX;
  entity.position[2] += moveZ;
  entity.speed = speed;
  entity.heading = rollHeading;

  // Keep ball at ground level (Ball.jsx adds its own RADIUS Y offset for the mesh)
  entity.position[1] = 0;

  // Boundary clamping
  entity.position[0] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[0]));
  entity.position[2] = Math.max(-BOUNDARY, Math.min(BOUNDARY, entity.position[2]));

  // Timer countdown
  entity.behaviorTimer -= delta;
  stateData.rollDistance += speed * delta;

  if (entity.behaviorTimer <= 0) {
    entity.behaviorState = 'stopped';
    entity.speed = 0;
    entity.soundIntensity = 0;
  }

  return entity;
}
