// ============================================================
// Road Generation — Road segments, intersections, markings
// Pure function: (gridConfig) → road data
// ============================================================

import { GRID, LANE_MARKING, CROSSWALK } from '../../constants/world.js';
import {
  getIntersectionCenter,
  getRoadSegmentData,
} from '../../utils/blockLayout.js';

/**
 * Generate lane marking dashes for a road segment.
 */
function generateLaneMarkings(segment) {
  const markings = [];
  const { center, length, orientation } = segment;

  // Dashes along the center line of the road
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
      });
    } else {
      markings.push({
        position: [center[0], 0.02, center[2] + offset],
        width: LANE_MARKING.DASH_WIDTH,
        length: LANE_MARKING.DASH_LENGTH,
      });
    }
  }

  return markings;
}

/**
 * Generate crosswalk stripes at an intersection.
 * Places crosswalks on all 4 approaches.
 */
function generateCrosswalks(intersection) {
  const crosswalks = [];
  const [ix, , iz] = intersection.position;
  const halfRoad = GRID.ROAD_WIDTH / 2;

  // Offset from intersection center to crosswalk center
  const cwOffset = halfRoad + 2; // 2m into the road segment from intersection edge

  // 4 directions: north, south, east, west
  const directions = [
    { dx: 0, dz: -cwOffset, orient: 'horizontal' }, // north approach
    { dx: 0, dz: cwOffset, orient: 'horizontal' },  // south approach
    { dx: -cwOffset, dz: 0, orient: 'vertical' },   // west approach
    { dx: cwOffset, dz: 0, orient: 'vertical' },    // east approach
  ];

  for (const dir of directions) {
    const cx = ix + dir.dx;
    const cz = iz + dir.dz;

    // Generate individual stripes
    const totalWidth =
      CROSSWALK.STRIPE_COUNT * CROSSWALK.STRIPE_WIDTH +
      (CROSSWALK.STRIPE_COUNT - 1) * CROSSWALK.STRIPE_GAP;
    const startOffset = -totalWidth / 2 + CROSSWALK.STRIPE_WIDTH / 2;

    for (let s = 0; s < CROSSWALK.STRIPE_COUNT; s++) {
      const stripeOffset =
        startOffset + s * (CROSSWALK.STRIPE_WIDTH + CROSSWALK.STRIPE_GAP);

      if (dir.orient === 'horizontal') {
        // Stripes run east-west, spaced along Z
        crosswalks.push({
          position: [cx, 0.02, cz + stripeOffset],
          width: CROSSWALK.STRIPE_LENGTH,
          length: CROSSWALK.STRIPE_WIDTH,
        });
      } else {
        // Stripes run north-south, spaced along X
        crosswalks.push({
          position: [cx + stripeOffset, 0.02, cz],
          width: CROSSWALK.STRIPE_WIDTH,
          length: CROSSWALK.STRIPE_LENGTH,
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
      laneMarkings.push(...generateLaneMarkings(seg));
      sidewalks.push(...generateSidewalks(seg));
    }
  }

  // Generate vertical road segments
  for (let c = 0; c < roadCount; c++) {
    for (let r = 0; r < roadCount - 1; r++) {
      const seg = getRoadSegmentData(r, c, 'vertical');
      segments.push(seg);
      laneMarkings.push(...generateLaneMarkings(seg));
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
