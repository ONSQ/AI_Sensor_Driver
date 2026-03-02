import * as YUKA from 'yuka';
import { getIntersectionCenter } from '../utils/blockLayout.js';

/**
 * Helper to get right-lane offset point from start to end intersection.
 * Shifts the point 1.5m to the right of the direction of travel.
 */
function getLaneOffsetPoint(startPos, endPos, isStart) {
    const dx = endPos[0] - startPos[0];
    const dz = endPos[2] - startPos[2];

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len === 0) return new YUKA.Vector3(startPos[0], startPos[1], startPos[2]);

    const ndx = dx / len;
    const ndz = dz / len;

    // Right vector: cross product of Dir(ndx, 0, ndz) and Up(0, 1, 0)
    const rx = -ndz;
    const rz = ndx;

    const laneOffset = 1.5;
    const basePos = isStart ? startPos : endPos;

    return new YUKA.Vector3(
        basePos[0] + rx * laneOffset,
        0,
        basePos[2] + rz * laneOffset
    );
}

/**
 * Creates a continuous loop path for an NPC.
 */
export function createNPCRoute(sequence) {
    const path = new YUKA.Path();
    path.loop = true;

    let lastPoint = null;

    for (let i = 0; i < sequence.length; i++) {
        const curr = sequence[i];
        const next = sequence[(i + 1) % sequence.length];

        const currPos = getIntersectionCenter(curr.row, curr.col);
        const nextPos = getIntersectionCenter(next.row, next.col);

        const p1 = getLaneOffsetPoint(currPos, nextPos, true);
        const p2 = getLaneOffsetPoint(currPos, nextPos, false);

        if (!lastPoint || lastPoint.squaredDistanceTo(p1) > 0.1) {
            path.add(p1);
            lastPoint = p1;
        }
        if (p1.squaredDistanceTo(p2) > 0.1) {
            path.add(p2);
            lastPoint = p2;
        }
    }

    return path;
}

/**
 * Generates a random valid rectangular loop on the 5x5 intersection grid.
 */
export function generateRandomLoop() {
    const r1 = Math.floor(Math.random() * 3); // max 2
    const c1 = Math.floor(Math.random() * 3); // max 2

    const w = 1 + Math.floor(Math.random() * 2); // 1 or 2
    const h = 1 + Math.floor(Math.random() * 2); // 1 or 2

    const r2 = r1 + h;
    const c2 = c1 + w;

    const clockwise = Math.random() > 0.5;

    const sequence = [];
    if (clockwise) {
        for (let c = c1; c < c2; c++) sequence.push({ row: r1, col: c });
        for (let r = r1; r < r2; r++) sequence.push({ row: r, col: c2 });
        for (let c = c2; c > c1; c--) sequence.push({ row: r2, col: c });
        for (let r = r2; r > r1; r--) sequence.push({ row: r, col: c1 });
    } else {
        for (let r = r1; r < r2; r++) sequence.push({ row: r, col: c1 });
        for (let c = c1; c < c2; c++) sequence.push({ row: r2, col: c });
        for (let r = r2; r > r1; r--) sequence.push({ row: r, col: c2 });
        for (let c = c2; c > c1; c--) sequence.push({ row: r1, col: c });
    }

    return createNPCRoute(sequence);
}
