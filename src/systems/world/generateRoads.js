// ============================================================
// Road Generation — Road segments, intersections, markings
// Pure function: (gridConfig) → road data
// ============================================================

import { GRID, LANE_MARKING, CROSSWALK, ZONE_MAP, NO_PASSING_ZONES, LANE_COLORS } from '../../constants/world.js';
import {
  getIntersectionCenter,
  getRoadSegmentData,
} from '../../utils/blockLayout.js';

/**
 * Check if a road segment is adjacent to a no-passing zone (school/hospital/construction).
 * A horizontal segment at row r between cols c and c+1 borders block (r-1,c) above and (r,c) below.
 * A vertical segment at col c between rows r and r+1 borders block (r,c-1) left and (r,c) right.
 */
function isNoPassingSegment(row, col, orientation) {
  const maxBlock = GRID.BLOCKS_PER_SIDE - 1; // 3
  const adjacent = [];

  if (orientation === 'horizontal') {
    // Horizontal road at intersection-row r, between intersection-cols c and c+1
    // Block above: (r-1, c)   Block below: (r, c)
    if (row > 0 && col <= maxBlock)  adjacent.push(ZONE_MAP[row - 1][col]);
    if (row <= maxBlock && col <= maxBlock) adjacent.push(ZONE_MAP[row][col]);
  } else {
    // Vertical road at intersection-col c, between intersection-rows r and r+1
    // Block left: (r, c-1)   Block right: (r, c)
    if (col > 0 && row <= maxBlock) adjacent.push(ZONE_MAP[row][col - 1]);
    if (col <= maxBlock && row <= maxBlock) adjacent.push(ZONE_MAP[row][col]);
  }

  return adjacent.some((zone) => NO_PASSING_ZONES.has(zone));
}

/**
 * Generate lane markings for a road segment.
 * Normal roads: dashed yellow center line.
 * No-passing zones (school/hospital/construction): solid double-yellow center lines.
 */
function generateLaneMarkings(segment, isSolid) {
  const markings = [];
  const { center, length, orientation } = segment;
  const color = LANE_COLORS.CENTER_YELLOW;

  if (isSolid) {
    // Solid double-yellow: two continuous lines separated by a small gap
    const halfGap = LANE_MARKING.DOUBLE_LINE_GAP / 2 + LANE_MARKING.DASH_WIDTH / 2;

    if (orientation === 'horizontal') {
      // Two solid lines offset in Z (across road)
      markings.push({
        position: [center[0], 0.02, center[2] - halfGap],
        width: length,
        length: LANE_MARKING.DASH_WIDTH,
        color,
        solid: true,
      });
      markings.push({
        position: [center[0], 0.02, center[2] + halfGap],
        width: length,
        length: LANE_MARKING.DASH_WIDTH,
        color,
        solid: true,
      });
    } else {
      // Two solid lines offset in X (across road)
      markings.push({
        position: [center[0] - halfGap, 0.02, center[2]],
        width: LANE_MARKING.DASH_WIDTH,
        length: length,
        color,
        solid: true,
      });
      markings.push({
        position: [center[0] + halfGap, 0.02, center[2]],
        width: LANE_MARKING.DASH_WIDTH,
        length: length,
        color,
        solid: true,
      });
    }
  } else {
    // Dashed center line (existing behavior)
    const dashCount = Math.floor(length / (LANE_MARKING.DASH_LENGTH + LANE_MARKING.DASH_GAP));
    const totalDashSpan = dashCount * (LANE_MARKING.DASH_LENGTH + LANE_MARKING.DASH_GAP);
    const startOffset = -totalDashSpan / 2 + LANE_MARKING.DASH_LENGTH / 2;

    for (let i = 0; i < dashCount; i++) {
      const offset = startOffset + i * (LANE_MARKING.DASH_LENGTH + LANE_MARKING.DASH_GAP);

      if (orientation === 'horizontal') {
        markings.push({
          position: [center[0] + offset, 0.02, center[2]],
          width: LANE_MARKING.DASH_LENGTH,
          length: LANE_MARKING.DASH_WIDTH,
          color,
        });
      } else {
        markings.push({
          position: [center[0], 0.02, center[2] + offset],
          width: LANE_MARKING.DASH_WIDTH,
          length: LANE_MARKING.DASH_LENGTH,
          color,
        });
      }
    }
  }

  return markings;
}

/**
 * Generate ladder / continental-style crosswalk stripes at an intersection.
 *
 * Real-world ladder crosswalks:
 *   - Stripes run PARALLEL to the traffic they interrupt.
 *   - Stripes are spaced ACROSS the road width (perpendicular to traffic).
 *
 * Intersection edges (bird's eye, +X=East, +Z=South):
 *
 *        ┌─── North edge ───┐   ← pedestrians cross E↔W
 *        │   NS road here   │      stripes run N-S (long in Z)
 *   ┌────┼──────────────────┼────┐
 *   │West│   INTERSECTION   │East│  ← pedestrians cross N↔S
 *   │edge│                  │edge│    stripes run E-W (long in X)
 *   └────┼──────────────────┼────┘
 *        │   NS road here   │
 *        └─── South edge ───┘
 *
 * North/South edges (on NS road approaches):
 *   Each stripe: long in Z (STRIPE_LENGTH), thin in X (STRIPE_WIDTH)
 *   Stripes spaced across road width in X.
 *
 * East/West edges (on EW road approaches):
 *   Each stripe: long in X (STRIPE_LENGTH), thin in Z (STRIPE_WIDTH)
 *   Stripes spaced across road width in Z.
 */
function generateCrosswalks(intersection) {
  const crosswalks = [];
  const [ix, , iz] = intersection.position;
  const halfRoad = GRID.ROAD_WIDTH / 2; // 5m

  // Crosswalk band center sits just outside the intersection square
  const edgeOffset = halfRoad + CROSSWALK.CROSSWALK_DEPTH / 2;

  // Total span of all stripes across the road
  const totalSpan =
    CROSSWALK.STRIPE_COUNT * CROSSWALK.STRIPE_WIDTH +
    (CROSSWALK.STRIPE_COUNT - 1) * CROSSWALK.STRIPE_GAP;
  const startOffset = -totalSpan / 2 + CROSSWALK.STRIPE_WIDTH / 2;

  // 4 edges of the intersection
  const edges = [
    // North edge: on NS road, stripes run N-S, spaced in X
    { cx: ix, cz: iz - edgeOffset, type: 'ns' },
    // South edge: on NS road, stripes run N-S, spaced in X
    { cx: ix, cz: iz + edgeOffset, type: 'ns' },
    // West edge: on EW road, stripes run E-W, spaced in Z
    { cx: ix - edgeOffset, cz: iz, type: 'ew' },
    // East edge: on EW road, stripes run E-W, spaced in Z
    { cx: ix + edgeOffset, cz: iz, type: 'ew' },
  ];

  for (const edge of edges) {
    for (let s = 0; s < CROSSWALK.STRIPE_COUNT; s++) {
      const so = startOffset + s * (CROSSWALK.STRIPE_WIDTH + CROSSWALK.STRIPE_GAP);

      if (edge.type === 'ns') {
        // North/south edges — stripes run N-S (parallel to NS traffic)
        // Each stripe: thin in X (STRIPE_WIDTH), long in Z (STRIPE_LENGTH)
        // Spaced across road width in X
        crosswalks.push({
          position: [edge.cx + so, 0.02, edge.cz],
          width: CROSSWALK.STRIPE_WIDTH,    // X dimension (thin)
          length: CROSSWALK.STRIPE_LENGTH,  // Z dimension (long)
        });
      } else {
        // East/west edges — stripes run E-W (parallel to EW traffic)
        // Each stripe: long in X (STRIPE_LENGTH), thin in Z (STRIPE_WIDTH)
        // Spaced across road width in Z
        crosswalks.push({
          position: [edge.cx, 0.02, edge.cz + so],
          width: CROSSWALK.STRIPE_LENGTH,   // X dimension (long)
          length: CROSSWALK.STRIPE_WIDTH,   // Z dimension (thin)
        });
      }
    }
  }

  return crosswalks;
}

/**
 * Generate sidewalk data for a road segment.
 * Two sidewalks per segment, one on each side.
 */
function generateSidewalks(segment) {
  const sidewalks = [];
  const { center, length, width, orientation } = segment;
  const offset = width / 2 - GRID.SIDEWALK_WIDTH / 2; // offset from road center to sidewalk center

  if (orientation === 'horizontal') {
    // Sidewalks on north and south side
    sidewalks.push({
      position: [center[0], 0.05, center[2] - offset],
      width: length,
      depth: GRID.SIDEWALK_WIDTH,
      orientation,
    });
    sidewalks.push({
      position: [center[0], 0.05, center[2] + offset],
      width: length,
      depth: GRID.SIDEWALK_WIDTH,
      orientation,
    });
  } else {
    // Sidewalks on east and west side
    sidewalks.push({
      position: [center[0] - offset, 0.05, center[2]],
      width: GRID.SIDEWALK_WIDTH,
      depth: length,
      orientation,
    });
    sidewalks.push({
      position: [center[0] + offset, 0.05, center[2]],
      width: GRID.SIDEWALK_WIDTH,
      depth: length,
      orientation,
    });
  }

  return sidewalks;
}

/**
 * Generate the complete road network data.
 * @returns {{ segments, intersections, crosswalks, laneMarkings, sidewalks }}
 */
export function generateRoads() {
  const segments = [];
  const intersections = [];
  const crosswalks = [];
  const laneMarkings = [];
  const sidewalks = [];

  const roadCount = GRID.BLOCKS_PER_SIDE + 1; // 5

  // Generate intersections (5×5 = 25)
  for (let r = 0; r < roadCount; r++) {
    for (let c = 0; c < roadCount; c++) {
      const pos = getIntersectionCenter(r, c);
      const isInterior = r > 0 && r < roadCount - 1 && c > 0 && c < roadCount - 1;

      intersections.push({
        id: `intersection-${r}-${c}`,
        position: pos,
        size: GRID.ROAD_WIDTH,
        hasTrafficLight: isInterior, // interior intersections get lights
        hasCrosswalk: true,
      });
    }
  }

  // Generate horizontal road segments
  for (let r = 0; r < roadCount; r++) {
    for (let c = 0; c < roadCount - 1; c++) {
      const seg = getRoadSegmentData(r, c, 'horizontal');
      segments.push(seg);
      const solid = isNoPassingSegment(r, c, 'horizontal');
      laneMarkings.push(...generateLaneMarkings(seg, solid));
      sidewalks.push(...generateSidewalks(seg));
    }
  }

  // Generate vertical road segments
  for (let c = 0; c < roadCount; c++) {
    for (let r = 0; r < roadCount - 1; r++) {
      const seg = getRoadSegmentData(r, c, 'vertical');
      segments.push(seg);
      const solid = isNoPassingSegment(r, c, 'vertical');
      laneMarkings.push(...generateLaneMarkings(seg, solid));
      sidewalks.push(...generateSidewalks(seg));
    }
  }

  // Generate crosswalks at each intersection
  for (const inter of intersections) {
    if (inter.hasCrosswalk) {
      crosswalks.push(...generateCrosswalks(inter));
    }
  }

  return { segments, intersections, crosswalks, laneMarkings, sidewalks };
}
