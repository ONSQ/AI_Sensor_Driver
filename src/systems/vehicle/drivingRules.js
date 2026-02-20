// ============================================================
// Driving Rules — Player score for obeying traffic laws
// ============================================================

import { SPEED_LIMITS } from '../../constants/traffic.js';
import { GRID, WORLD_HALF } from '../../constants/world.js';
import { VEHICLE_PHYSICS } from '../../constants/vehicle.js';

let speedingTimer = 0;
let goodDrivingTimer = 0;

let currentIntersection = null;
let hasStoppedNearIntersection = false;

function normalizeAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
}

export function evaluateDrivingRules(vehicleState, trafficState, delta) {
    let scoreDelta = 0;

    // 1. Speed Limit Checks
    const currentSpeedMph = Math.abs(vehicleState.speed * VEHICLE_PHYSICS.MPS_TO_MPH);
    const limit = SPEED_LIMITS[vehicleState.currentZone] || 35;

    if (currentSpeedMph > limit + 5) {
        speedingTimer += delta;
        if (speedingTimer > 2.0) { // Penalize every 2 seconds of continuous speeding
            scoreDelta -= 25;
            speedingTimer = 0;
        }
        goodDrivingTimer = 0; // Reset good driving streak
    } else {
        speedingTimer = 0;

        // Accumulate good driving points if moving at a reasonable speed
        if (currentSpeedMph > 5 && currentSpeedMph <= limit + 5) {
            goodDrivingTimer += delta;
            if (goodDrivingTimer > 5.0) { // +10 points every 5 seconds of clean driving
                scoreDelta += 10;
                goodDrivingTimer = 0;
            }
        }
    }

    // 2. Intersection & Traffic Light Checks
    const x = vehicleState.position[0];
    const z = vehicleState.position[2];
    const halfRoad = GRID.ROAD_WIDTH / 2;
    const stride = GRID.BLOCK_STRIDE;

    const col = Math.round((x + WORLD_HALF - halfRoad) / stride);
    const row = Math.round((z + WORLD_HALF - halfRoad) / stride);
    const clampedRow = Math.max(0, Math.min(4, row));
    const clampedCol = Math.max(0, Math.min(4, col));

    const intX = -WORLD_HALF + halfRoad + clampedCol * stride;
    const intZ = -WORLD_HALF + halfRoad + clampedRow * stride;
    const intersectionDist = Math.max(Math.abs(x - intX), Math.abs(z - intZ));
    const intKey = `${clampedRow},${clampedCol}`;

    const isInterior = clampedRow >= 1 && clampedRow <= 3 && clampedCol >= 1 && clampedCol <= 3;
    const isPerimeter = !isInterior;

    // Track if vehicle came to a full stop recently near an intersection
    if (intersectionDist > halfRoad && intersectionDist < halfRoad + 15) {
        if (Math.abs(vehicleState.speed) < 0.2) {
            hasStoppedNearIntersection = true;
        }
    }

    // Inside the actual intersection box
    if (intersectionDist < halfRoad * 0.8) {
        if (currentIntersection !== intKey) {
            currentIntersection = intKey; // Just entered!

            const absHeading = Math.abs(normalizeAngle(vehicleState.heading));
            const isNS = absHeading < Math.PI / 4 || absHeading > (3 * Math.PI / 4);
            const axis = isNS ? 'ns' : 'ew';

            if (isInterior) {
                // Check traffic light
                const lightState = trafficState.getLightState(axis);
                if (lightState === 'red') {
                    scoreDelta -= 100; // Penalize running a red light
                    goodDrivingTimer = 0;
                } else if (lightState === 'green') {
                    scoreDelta += 20;  // Reward going through green
                }
            } else if (isPerimeter) {
                // Check stop sign
                if (!hasStoppedNearIntersection) {
                    scoreDelta -= 50; // Penalize rolling/running a stop sign
                    goodDrivingTimer = 0;
                } else {
                    scoreDelta += 20; // Reward proper stop
                }
            }
        }
    } else {
        // Exited intersection
        if (currentIntersection !== null && intersectionDist > halfRoad + 2) {
            currentIntersection = null;
            hasStoppedNearIntersection = false; // reset for next intersection
        }
    }

    return scoreDelta;
}
