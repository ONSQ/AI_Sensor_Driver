// ============================================================
// Collision Detection & Response — SensorRacer v2
//
// buildCollisionData(worldData)  — pre-process once per seed
// resolveCollisions(vehicleState, collisionData) — every frame
//
// Buildings: AABB vs vehicle OBB → dead stop + pushback
// Cones / barriers / poles: circle/OBB vs vehicle OBB → slowdown
// ============================================================

import { VEHICLE_DIMS } from '../../constants/vehicle.js';
import { PROP_DIMS } from '../../constants/traffic.js';
import { GRID, WORLD_HALF } from '../../constants/world.js';
import { ENTITY_COLLISION } from '../../constants/entities.js';

// Vehicle half-dimensions for OBB
const VHW = VEHICLE_DIMS.BODY_WIDTH / 2;   // 0.9
const VHL = VEHICLE_DIMS.BODY_LENGTH / 2;  // 2.1

// Slowdown factors per collision type (fraction of speed removed)
const SLOWDOWN = {
  cone: 0.3,
  barrier: 0.5,
  pole: 0.2,
};

// Score penalties per collision type (from architecture doc)
const SCORE_PENALTY = {
  cone: -50,
  barrier: -50,
  building: -25,
  pole: -25,
};

// Cooldown frames before the same object can score-penalize again
const HIT_COOLDOWN_FRAMES = 60; // ~1 second at 60fps

// Pushback margin to prevent sticking (meters)
const PUSH_MARGIN = 0.02;

// ============================================================
// 1. Pre-processing — build spatial collision database
// ============================================================

/**
 * Build collision data from world generation output.
 * Returns { byBlock: { "row,col": [...] }, global: [...] }
 */
export function buildCollisionData(worldData) {
  const byBlock = {};
  const global = [];
  let nextId = 0;

  // --- Buildings & props from each block ---
  for (const block of worldData.blocks) {
    const key = `${block.row},${block.col}`;
    const objects = [];

    // Buildings → AABB
    for (const b of block.buildings) {
      const [x, , z] = b.position;
      objects.push({
        id: nextId++,
        type: 'building',
        minX: x - b.width / 2,
        maxX: x + b.width / 2,
        minZ: z - b.depth / 2,
        maxZ: z + b.depth / 2,
      });
    }

    // Props
    for (const p of block.props) {
      const [px, , pz] = p.position;

      if (p.type === 'cone') {
        objects.push({
          id: nextId++,
          type: 'cone',
          cx: px,
          cz: pz,
          radius: PROP_DIMS.CONE_BASE_RADIUS,
        });
      } else if (p.type === 'barrier') {
        const rot = p.rotation || 0;
        objects.push({
          id: nextId++,
          type: 'barrier',
          cx: px,
          cz: pz,
          hw: PROP_DIMS.BARRIER_WIDTH / 2,
          hd: PROP_DIMS.BARRIER_DEPTH / 2,
          sinR: Math.sin(rot),
          cosR: Math.cos(rot),
        });
      } else if (
        p.type === 'school_sign' ||
        p.type === 'hospital_cross' ||
        p.type === 'speed_sign'
      ) {
        objects.push({
          id: nextId++,
          type: 'pole',
          cx: px,
          cz: pz,
          radius: 0.1,
        });
      }
    }

    byBlock[key] = objects;
  }

  // --- Traffic light poles (on roads, not inside blocks) ---
  if (worldData.trafficLights) {
    for (const tl of worldData.trafficLights) {
      global.push({
        id: nextId++,
        type: 'pole',
        cx: tl.position[0],
        cz: tl.position[2],
        radius: 0.15,
      });
    }
  }

  // --- Stop sign poles ---
  if (worldData.stopSigns) {
    for (const ss of worldData.stopSigns) {
      global.push({
        id: nextId++,
        type: 'pole',
        cx: ss.position[0],
        cz: ss.position[2],
        radius: 0.15,
      });
    }
  }

  // Hit cooldown tracker: id → frames remaining
  const hitCooldowns = new Map();

  return { byBlock, global, hitCooldowns };
}

// ============================================================
// 2. Spatial query — which blocks to check
// ============================================================

/**
 * Get block keys near the vehicle position.
 * Returns up to 4 block keys (the block the vehicle is in + neighbours).
 */
function getNearbyBlockKeys(x, z) {
  const startEdge = -WORLD_HALF + GRID.ROAD_WIDTH; // -95
  const keys = new Set();

  // Check a 2×2 neighbourhood around the vehicle
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

// ============================================================
// 3. Vehicle OBB helpers
// ============================================================

/**
 * Get 4 corners of the vehicle OBB in world space.
 * Returns [[x,z], [x,z], [x,z], [x,z]] — FL, FR, BR, BL
 */
function getVehicleCorners(x, z, sinH, cosH) {
  // Local corners (x, z) where -Z is forward
  // FL = front-left, FR = front-right, BR = back-right, BL = back-left
  const localCorners = [
    [-VHW, -VHL], // front-left
    [VHW, -VHL],  // front-right
    [VHW, VHL],   // back-right
    [-VHW, VHL],  // back-left
  ];

  return localCorners.map(([lx, lz]) => [
    x + lx * cosH + lz * sinH,
    z - lx * sinH + lz * cosH,
  ]);
}

/**
 * Project an array of [x,z] points onto an axis (axX, axZ).
 * Returns { min, max }.
 */
function projectOntoAxis(points, axX, axZ) {
  let min = Infinity;
  let max = -Infinity;
  for (const [px, pz] of points) {
    const d = px * axX + pz * axZ;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

/**
 * Project an AABB onto an axis. Returns { min, max }.
 */
function projectAABBOntoAxis(aabb, axX, axZ) {
  // AABB has 4 corners
  const corners = [
    [aabb.minX, aabb.minZ],
    [aabb.maxX, aabb.minZ],
    [aabb.maxX, aabb.maxZ],
    [aabb.minX, aabb.maxZ],
  ];
  return projectOntoAxis(corners, axX, axZ);
}

// ============================================================
// 4. Collision detection algorithms
// ============================================================

/**
 * AABB (building) vs OBB (vehicle) collision using SAT.
 * Returns null if no collision, or { pushX, pushZ } — minimum push to resolve.
 */
function aabbVsOBB(aabb, corners, sinH, cosH) {
  // 4 separating axes: 2 from AABB (world X, world Z), 2 from vehicle OBB
  const axes = [
    [1, 0],        // world X
    [0, 1],        // world Z
    [cosH, sinH],  // vehicle local X (right)
    [-sinH, cosH], // vehicle local Z (forward)
  ];

  let minOverlap = Infinity;
  let minAxis = null;

  for (const [axX, axZ] of axes) {
    const projV = projectOntoAxis(corners, axX, axZ);
    const projB = projectAABBOntoAxis(aabb, axX, axZ);

    // Check overlap
    const overlap = Math.min(projV.max - projB.min, projB.max - projV.min);
    if (overlap <= 0) return null; // Separating axis found — no collision

    if (overlap < minOverlap) {
      minOverlap = overlap;
      // Direction: push vehicle away from building
      // Determine sign: push in direction from building center to vehicle center
      const bCenterProj = ((aabb.minX + aabb.maxX) / 2) * axX +
        ((aabb.minZ + aabb.maxZ) / 2) * axZ;
      const vCenterProj = projV.min + (projV.max - projV.min) / 2;
      const sign = vCenterProj > bCenterProj ? 1 : -1;
      minAxis = [axX * sign, axZ * sign];
      minOverlap = overlap;
    }
  }

  return {
    pushX: minAxis[0] * (minOverlap + PUSH_MARGIN),
    pushZ: minAxis[1] * (minOverlap + PUSH_MARGIN),
  };
}

/**
 * Circle vs vehicle OBB collision.
 * Transform circle into vehicle local space, find closest point on rect.
 */
function circleVsOBB(cx, cz, radius, vx, vz, sinH, cosH) {
  // Transform circle center to vehicle local space
  const dx = cx - vx;
  const dz = cz - vz;
  const localX = dx * cosH - dz * sinH;
  const localZ = dx * sinH + dz * cosH;

  // Closest point on rectangle [-VHW..VHW] × [-VHL..VHL]
  const closestX = Math.max(-VHW, Math.min(VHW, localX));
  const closestZ = Math.max(-VHL, Math.min(VHL, localZ));

  // Distance from circle center to closest point
  const distX = localX - closestX;
  const distZ = localZ - closestZ;
  const distSq = distX * distX + distZ * distZ;

  return distSq < radius * radius;
}

/**
 * OBB (barrier) vs OBB (vehicle) collision using SAT.
 */
function obbVsOBB(bCx, bCz, bHw, bHd, bSin, bCos, vCorners, vSinH, vCosH) {
  // Barrier corners
  const bCorners = [
    [bCx + (-bHw) * bCos - (-bHd) * bSin, bCz + (-bHw) * bSin + (-bHd) * bCos],
    [bCx + (bHw) * bCos - (-bHd) * bSin, bCz + (bHw) * bSin + (-bHd) * bCos],
    [bCx + (bHw) * bCos - (bHd) * bSin, bCz + (bHw) * bSin + (bHd) * bCos],
    [bCx + (-bHw) * bCos - (bHd) * bSin, bCz + (-bHw) * bSin + (bHd) * bCos],
  ];

  // 4 axes: 2 from vehicle, 2 from barrier
  const axes = [
    [vCosH, vSinH],   // vehicle local X
    [-vSinH, vCosH],  // vehicle local Z
    [bCos, bSin],      // barrier local X
    [-bSin, bCos],     // barrier local Z
  ];

  for (const [axX, axZ] of axes) {
    const projV = projectOntoAxis(vCorners, axX, axZ);
    const projB = projectOntoAxis(bCorners, axX, axZ);

    const overlap = Math.min(projV.max - projB.min, projB.max - projV.min);
    if (overlap <= 0) return false; // Separating axis → no collision
  }

  return true; // All axes overlap → collision
}

// ============================================================
// 5. Main collision resolution — called every frame
// ============================================================

/**
 * Resolve collisions against the candidate vehicle state.
 * Returns { state, scoreDelta } where scoreDelta is the total
 * point change from new hits this frame (0 if no new scored hits).
 */
export function resolveCollisions(vehicleState, collisionData) {
  const [vx, vy, vz] = vehicleState.position;
  const { heading, speed } = vehicleState;

  const sinH = Math.sin(heading);
  const cosH = Math.cos(heading);
  const corners = getVehicleCorners(vx, vz, sinH, cosH);

  // Tick down cooldowns
  const { hitCooldowns } = collisionData;
  for (const [id, frames] of hitCooldowns) {
    if (frames <= 1) hitCooldowns.delete(id);
    else hitCooldowns.set(id, frames - 1);
  }

  // Gather nearby collision objects
  const blockKeys = getNearbyBlockKeys(vx, vz);
  const nearby = [];
  for (const key of blockKeys) {
    const objs = collisionData.byBlock[key];
    if (objs) nearby.push(...objs);
  }
  // Add global objects (traffic light / stop sign poles)
  nearby.push(...collisionData.global);

  // Early exit if nothing nearby
  if (nearby.length === 0) return { state: vehicleState, scoreDelta: 0 };

  // Quick bounding circle for early-out (vehicle bounding radius)
  const vBoundRadius = Math.sqrt(VHW * VHW + VHL * VHL); // ~2.28m

  let pushX = 0;
  let pushZ = 0;
  let hitBuilding = false;
  let totalSlowdown = 0;
  let scoreDelta = 0;

  for (const obj of nearby) {
    if (obj.type === 'building') {
      // Quick early-out: distance from vehicle center to AABB center
      const bCx = (obj.minX + obj.maxX) / 2;
      const bCz = (obj.minZ + obj.maxZ) / 2;
      const bHw = (obj.maxX - obj.minX) / 2;
      const bHz = (obj.maxZ - obj.minZ) / 2;
      const dx = Math.abs(vx - bCx);
      const dz = Math.abs(vz - bCz);
      if (dx > bHw + vBoundRadius || dz > bHz + vBoundRadius) continue;

      const result = aabbVsOBB(obj, corners, sinH, cosH);
      if (result) {
        pushX += result.pushX;
        pushZ += result.pushZ;
        hitBuilding = true;
        // Score penalty (with cooldown)
        if (!hitCooldowns.has(obj.id)) {
          scoreDelta += SCORE_PENALTY.building;
          hitCooldowns.set(obj.id, HIT_COOLDOWN_FRAMES);
        }
      }
    } else if (obj.type === 'cone' || obj.type === 'pole') {
      // Quick distance check
      const dx = vx - obj.cx;
      const dz = vz - obj.cz;
      if (dx * dx + dz * dz > (vBoundRadius + obj.radius) * (vBoundRadius + obj.radius)) continue;

      if (circleVsOBB(obj.cx, obj.cz, obj.radius, vx, vz, sinH, cosH)) {
        totalSlowdown += SLOWDOWN[obj.type] || 0.2;
        // Score penalty (with cooldown)
        if (!hitCooldowns.has(obj.id)) {
          scoreDelta += SCORE_PENALTY[obj.type] || -25;
          hitCooldowns.set(obj.id, HIT_COOLDOWN_FRAMES);
        }
      }
    } else if (obj.type === 'barrier') {
      // Quick distance check
      const dx = vx - obj.cx;
      const dz = vz - obj.cz;
      const maxDim = Math.max(obj.hw, obj.hd) + vBoundRadius;
      if (dx * dx + dz * dz > maxDim * maxDim) continue;

      if (obbVsOBB(obj.cx, obj.cz, obj.hw, obj.hd, obj.sinR, obj.cosR, corners, sinH, cosH)) {
        totalSlowdown += SLOWDOWN.barrier;
        // Score penalty (with cooldown)
        if (!hitCooldowns.has(obj.id)) {
          scoreDelta += SCORE_PENALTY.barrier;
          hitCooldowns.set(obj.id, HIT_COOLDOWN_FRAMES);
        }
      }
    }
  }

  // --- Dynamic entity collisions ---
  // Entities are passed via collisionData.entityGetter (lazy accessor)
  if (collisionData.entityGetter) {
    const entities = collisionData.entityGetter();
    for (const ent of entities) {
      if (!ent.visible) continue;
      const dx = vx - ent.position[0];
      const dz = vz - ent.position[2];
      const distSq = dx * dx + dz * dz;
      const checkRadius = (ent.collisionRadius || 0.3) + vBoundRadius;
      if (distSq > checkRadius * checkRadius) continue;

      // Fine-grained: circle vs vehicle OBB
      if (!circleVsOBB(ent.position[0], ent.position[2], ent.collisionRadius || 0.3, vx, vz, sinH, cosH)) continue;

      // Cooldown check (use entity id + 100000 offset to avoid clash with static ids)
      const cooldownId = ent.id + 100000;
      if (hitCooldowns.has(cooldownId)) continue;
      hitCooldowns.set(cooldownId, ENTITY_COLLISION.HIT_COOLDOWN_FRAMES);

      if (ent.type === 'pedestrian') {
        hitBuilding = true;   // dead stop
        scoreDelta += ENTITY_COLLISION.PEDESTRIAN_PENALTY;
      } else if (ent.type === 'npcVehicle' || ent.type === 'emergency') {
        hitBuilding = true;   // dead stop
        scoreDelta += ENTITY_COLLISION.VEHICLE_PENALTY;
      } else if (ent.type === 'animal') {
        totalSlowdown += 0.5;
        scoreDelta += ENTITY_COLLISION.ANIMAL_PENALTY;
      } else if (ent.type === 'ball') {
        totalSlowdown += 0.2;
        scoreDelta += ENTITY_COLLISION.BALL_PENALTY;
      }
    }
  }

  // No collisions — return unchanged
  if (!hitBuilding && totalSlowdown === 0) return { state: vehicleState, scoreDelta };

  // Build corrected state
  let newX = vx;
  let newZ = vz;
  let newSpeed = speed;

  if (hitBuilding) {
    newX += pushX;
    newZ += pushZ;
    newSpeed = 0; // Dead stop
  } else {
    // Soft collision — reduce speed
    newSpeed *= Math.max(0, 1 - totalSlowdown);
  }

  // Re-clamp to world boundaries after pushback
  const margin = WORLD_HALF - 2;
  newX = Math.max(-margin, Math.min(margin, newX));
  newZ = Math.max(-margin, Math.min(margin, newZ));

  return {
    state: {
      ...vehicleState,
      position: [newX, vy, newZ],
      speed: newSpeed,
    },
    scoreDelta,
  };
}
