// ============================================================
// Sensor Utilities — shared math for all sensor engines
// ============================================================

import { GRID, WORLD_HALF } from '../../constants/world.js';
import { LIDAR, THERMAL } from '../../constants/sensors.js';

// ---- Spatial indexing (extracted from collisions.js pattern) ----

/**
 * Get block keys near a world position.
 * Returns a Set of "row,col" strings for nearby blocks.
 */
export function getNearbyBlockKeys(x, z) {
  const startEdge = -WORLD_HALF + GRID.ROAD_WIDTH; // -95
  const keys = new Set();

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const col = Math.floor((x + dx * 5 - startEdge) / GRID.BLOCK_STRIDE);
      const row = Math.floor((z + dz * 5 - startEdge) / GRID.BLOCK_STRIDE);
      if (row >= 0 && row < GRID.BLOCKS_PER_SIDE && col >= 0 && col < GRID.BLOCKS_PER_SIDE) {
        keys.add(`${row},${col}`);
      }
    }
  }

  return keys;
}

/**
 * Extended version: get block keys within a larger radius (for sensors with long range).
 */
export function getBlockKeysInRange(x, z, rangeM) {
  const startEdge = -WORLD_HALF + GRID.ROAD_WIDTH;
  const keys = new Set();
  const spread = Math.ceil(rangeM / GRID.BLOCK_STRIDE);

  const centerCol = Math.floor((x - startEdge) / GRID.BLOCK_STRIDE);
  const centerRow = Math.floor((z - startEdge) / GRID.BLOCK_STRIDE);

  for (let dr = -spread; dr <= spread; dr++) {
    for (let dc = -spread; dc <= spread; dc++) {
      const row = centerRow + dr;
      const col = centerCol + dc;
      if (row >= 0 && row < GRID.BLOCKS_PER_SIDE && col >= 0 && col < GRID.BLOCKS_PER_SIDE) {
        keys.add(`${row},${col}`);
      }
    }
  }

  return keys;
}

// ---- Distance helpers ----

/** Distance on XZ plane between two [x,y,z] arrays. */
export function distanceXZ(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/** Squared distance on XZ plane (avoids sqrt). */
export function distanceXZSq(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

// ---- Bearing / FOV helpers ----

/**
 * Compute bearing from vehicle to target relative to vehicle heading.
 * Returns angle in radians, [-PI, PI]. 0 = straight ahead.
 *
 * Vehicle heading: 0 = faces +Z (south), standard Three.js Y-rotation.
 * Forward vector: [-sin(h), 0, -cos(h)]
 */
export function bearingToTarget(vx, vz, heading, tx, tz) {
  const dx = tx - vx;
  const dz = tz - vz;
  // World angle to target (atan2 gives angle from +Z axis)
  const worldAngle = Math.atan2(dx, dz);
  // Relative to vehicle heading
  let rel = worldAngle - heading;
  // Normalize to [-PI, PI]
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  return rel;
}

/** Check if a bearing is within a half-FOV cone. */
export function isInFOV(bearing, halfFOV) {
  return Math.abs(bearing) <= halfFOV;
}

// ---- Line-of-sight ----

/**
 * 2D ray-vs-AABB intersection test on XZ plane.
 * Returns true if a ray from (sx,sz) to (tx,tz) intersects the AABB.
 */
function rayIntersectsAABB(sx, sz, tx, tz, minX, maxX, minZ, maxZ) {
  const dx = tx - sx;
  const dz = tz - sz;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) return false;

  const invDx = dx !== 0 ? 1 / dx : 1e12;
  const invDz = dz !== 0 ? 1 / dz : 1e12;

  let tMin = ((dx >= 0 ? minX : maxX) - sx) * invDx;
  let tMax = ((dx >= 0 ? maxX : minX) - sx) * invDx;
  const tzMin = ((dz >= 0 ? minZ : maxZ) - sz) * invDz;
  const tzMax = ((dz >= 0 ? maxZ : minZ) - sz) * invDz;

  if (tMin > tzMax || tzMin > tMax) return false;
  tMin = Math.max(tMin, tzMin);
  tMax = Math.min(tMax, tzMax);

  // Intersection must be between source and target (t in [0, 1])
  return tMax > 0.01 && tMin < 0.99;
}

/**
 * Check line-of-sight from source to target.
 * Returns true if there is a clear line (no building blocking).
 * buildingAABBs: array of { minX, maxX, minZ, maxZ }
 */
export function hasLineOfSight(sx, sz, tx, tz, buildingAABBs) {
  for (const aabb of buildingAABBs) {
    if (rayIntersectsAABB(sx, sz, tx, tz, aabb.minX, aabb.maxX, aabb.minZ, aabb.maxZ)) {
      return false;
    }
  }
  return true;
}

// ---- Color / palette helpers ----

/**
 * Interpolate FLIR palette: temperature → [r, g, b] (0-255).
 */
export function tempToFLIR(temp, palette) {
  if (temp <= palette[0].temp) return [...palette[0].color];
  if (temp >= palette[palette.length - 1].temp) return [...palette[palette.length - 1].color];

  for (let i = 0; i < palette.length - 1; i++) {
    const a = palette[i];
    const b = palette[i + 1];
    if (temp >= a.temp && temp <= b.temp) {
      const t = (temp - a.temp) / (b.temp - a.temp);
      return [
        Math.round(a.color[0] + (b.color[0] - a.color[0]) * t),
        Math.round(a.color[1] + (b.color[1] - a.color[1]) * t),
        Math.round(a.color[2] + (b.color[2] - a.color[2]) * t),
      ];
    }
  }

  return [0, 0, 0];
}

/**
 * LiDAR distance → hex color string.
 */
export function distanceToLidarColor(distance) {
  if (distance < LIDAR.CLOSE_THRESHOLD) return LIDAR.COLOR_CLOSE;
  if (distance > LIDAR.FAR_THRESHOLD) return LIDAR.COLOR_FAR;
  return LIDAR.COLOR_MID;
}

/**
 * Hex color string → { r, g, b } floats (0-1).
 */
export function hexToRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}

// ---- 3D → 2D projection ----

/**
 * Project a world position into a 2D camera viewport.
 * Returns { x, y } in [0,1] range, or null if behind camera.
 *
 * camPos: [x, y, z]
 * camHeading: radians (0 = faces +Z south)
 * fovRad: vertical field of view in radians
 * aspect: width/height ratio
 */
export function projectToViewport(worldPos, camPos, camHeading, fovRad, aspect) {
  const dx = worldPos[0] - camPos[0];
  const dz = worldPos[2] - camPos[2];
  const sinH = Math.sin(camHeading);
  const cosH = Math.cos(camHeading);

  // Rotate into camera space: forward = +localZ (into scene)
  const localX = dx * cosH + dz * sinH;
  const localZ = dx * sinH - dz * cosH; // positive = in front of camera

  if (localZ <= 0.5) return null; // Behind or too close

  const tanHalfFov = Math.tan(fovRad / 2);
  const ndcX = localX / (localZ * tanHalfFov * aspect);
  const ndcY = (worldPos[1] - camPos[1]) / (localZ * tanHalfFov);

  // Convert NDC [-1,1] to viewport [0,1]
  return {
    x: 0.5 + ndcX * 0.5,
    y: 0.5 - ndcY * 0.5,
  };
}
