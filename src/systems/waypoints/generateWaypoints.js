// ============================================================
// Waypoint Generation — Seed-based route through the city
// Pure function: (seed, startPosition) → waypoint array
// ============================================================

import { createRng } from '../../utils/random.js';
import { getIntersectionCenter } from '../../utils/blockLayout.js';

// Waypoint tuning
export const WAYPOINT_COUNT = 5;
export const WAYPOINT_REACH_RADIUS = 8;  // meters — intersection is 10m wide
export const WAYPOINT_SCORE = 200;

// 9 interior intersections (rows 1–3, cols 1–3) — these have traffic lights
const INTERIOR_INTERSECTIONS = [];
for (let r = 1; r <= 3; r++) {
  for (let c = 1; c <= 3; c++) {
    INTERIOR_INTERSECTIONS.push({ row: r, col: c });
  }
}

/**
 * Fisher-Yates shuffle using seeded RNG.
 */
function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sort positions into a nearest-neighbour route starting from startPos.
 */
function nearestNeighbourRoute(positions, startPos) {
  const remaining = [...positions];
  const route = [];
  let current = startPos;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dx = remaining[i].position[0] - current[0];
      const dz = remaining[i].position[2] - current[2];
      const dist = dx * dx + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    route.push(next);
    current = next.position;
  }

  return route;
}

/**
 * Generate waypoints for a session.
 * @param {number} seed — world seed for reproducibility
 * @param {number[]} startPosition — vehicle starting [x, y, z]
 * @returns {Array<{id: number, position: number[], reached: boolean}>}
 */
export function generateWaypoints(seed, startPosition) {
  const rng = createRng(seed + 7777); // offset to avoid correlating with building RNG

  // Shuffle interior intersections and pick WAYPOINT_COUNT
  const shuffled = shuffle(rng, INTERIOR_INTERSECTIONS);
  const selected = shuffled.slice(0, WAYPOINT_COUNT);

  // Convert to world positions
  const waypoints = selected.map((item, i) => ({
    id: i,
    position: getIntersectionCenter(item.row, item.col),
    reached: false,
  }));

  // Sort into nearest-neighbour route from vehicle start
  return nearestNeighbourRoute(waypoints, startPosition);
}
