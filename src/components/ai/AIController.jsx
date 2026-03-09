import { useEffect, useRef } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import useAIStore from '../../stores/useAIStore.js';
import useGameStore from '../../stores/useGameStore.js';
import { AIDriver } from '../../ai/AIDriver.js';
import { SPEED_LIMITS } from '../../constants/traffic.js';

export default function AIController({ enabled = true }) {
    const driverRef = useRef(null);
    const stopSignTracker = useRef({ isStopped: false, timeStopped: 0 });
    const overtakeState = useRef({ inOvertake: false, side: null });

    useEffect(() => {
        if (!enabled) return;

        console.log('[AIController] Mounting AI Control Loop...');
        const driver = new AIDriver();
        driver.init().then(() => {
            driverRef.current = driver;
        });

        const interval = setInterval(async () => {
            if (!driverRef.current) return;

            const aiState = useAIStore.getState();
            if (aiState.isPaused) return;

            const sensors = useSensorStore.getState();
            const vehicle = useVehicleStore.getState();
            const game = useGameStore.getState();

            const activeSensors = {
                lidar: sensors.sensors.lidar.enabled,
                thermal: sensors.sensors.thermal.enabled,
                camera: sensors.sensors.camera.enabled,
                audio: sensors.sensors.audio.enabled,
            };

            const rawSensors = {
                lidar: sensors.lidarData,
                thermal: sensors.thermalData,
                camera: sensors.cameraData,
                audio: sensors.audioData
            };

            let targetDirection = 'STRAIGHT';
            let alignedWithWaypoint = true;
            let headingErrorNormalized = 0.0;
            let crossTrackErrorRaw = 0.0;
            const [vx, , vz] = vehicle.position;

            if (game.waypoints.length > 0 && game.currentWaypointIndex < game.waypoints.length) {
                const wp = game.waypoints[game.currentWaypointIndex];
                const [wx, , wz] = wp.position;

                const dx = wx - vx;
                const dz = wz - vz;

                const distToWp = Math.sqrt(dx * dx + dz * dz);

                // Advance waypoint if close enough
                if (distToWp < 12) {
                    game.advanceWaypoint();
                } else {
                    // Manhattan Routing: Stay on roads instead of diagonally cutting across blocks
                    const isHeadingX = Math.abs(Math.sin(vehicle.heading)) > 0.707;
                    let targetDx = dx;
                    let targetDz = dz;

                    if (isHeadingX) {
                        // Wait until the vehicle is well inside the intersection (4m from center) before unlocking the Z axis to turn.
                        // The intersection is 14m wide (7m half-width).
                        if (Math.abs(dx) > 4) {
                            targetDz = 0; // Lock Z to current lane, drive straight along X
                        }
                    } else {
                        if (Math.abs(dz) > 4) {
                            targetDx = 0; // Lock X to current lane, drive straight along Z
                        }
                    }

                    // To calculate relative angle consistently, use dot/cross products with forward vector
                    const fwdX = -Math.sin(vehicle.heading);
                    const fwdZ = -Math.cos(vehicle.heading);

                    const distToTarget = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

                    if (distToTarget > 0.1) {
                        const ndx = targetDx / distToTarget;
                        const ndz = targetDz / distToTarget;

                        const crossY = fwdZ * ndx - fwdX * ndz;
                        // Dot product = cos of angle
                        const dot = fwdX * ndx + fwdZ * ndz;

                        // Math.atan2(y, x) -> atan2(cross, dot) gives -PI to PI
                        const relativeAngle = Math.atan2(crossY, dot);
                        const angleDeg = relativeAngle * (180 / Math.PI);

                        // Extract normalized heading error (-1.0 to 1.0)
                        headingErrorNormalized = relativeAngle / Math.PI;

                        if (angleDeg > 10) {
                            targetDirection = 'LEFT';
                            alignedWithWaypoint = false;
                        } else if (angleDeg < -10) {
                            targetDirection = 'RIGHT';
                            alignedWithWaypoint = false;
                        }
                    }
                }
            }

            // --- Intersection & Strict Lane Centering ---
            const roadWidthHalf = 7;
            const gridStride = 54;
            const col = Math.round((vx + 115 - roadWidthHalf) / gridStride);
            const row = Math.round((vz + 115 - roadWidthHalf) / gridStride);
            const intersectionCenterX = -115 + roadWidthHalf + col * gridStride;
            const intersectionCenterZ = -115 + roadWidthHalf + row * gridStride;

            const distFromCenterX = Math.abs(vx - intersectionCenterX);
            const distFromCenterZ = Math.abs(vz - intersectionCenterZ);

            // We are inside an intersection if within the 14x14m square
            const inIntersection = distFromCenterX < roadWidthHalf && distFromCenterZ < roadWidthHalf;

            // Strict Lane Keeping to prevent driving into buildings (only active when not turning wildly in an intersection)
            if (!inIntersection) {
                const laneOffset = 1.5;
                if (distFromCenterZ < roadWidthHalf) {
                    // On East-West Road
                    const isEastBound = Math.sin(vehicle.heading) < 0;
                    const targetZ = intersectionCenterZ + (isEastBound ? laneOffset : -laneOffset);
                    const errorZ = vz - targetZ;
                    crossTrackErrorRaw = errorZ;

                    if (errorZ > 0.8) targetDirection = isEastBound ? 'LEFT' : 'RIGHT';
                    if (errorZ < -0.8) targetDirection = isEastBound ? 'RIGHT' : 'LEFT';
                } else if (distFromCenterX < roadWidthHalf) {
                    // On North-South Road
                    const isSouthBound = Math.cos(vehicle.heading) < 0;
                    const targetX = intersectionCenterX + (isSouthBound ? -laneOffset : laneOffset);
                    const errorX = vx - targetX;
                    crossTrackErrorRaw = errorX;

                    if (errorX > 0.8) targetDirection = isSouthBound ? 'RIGHT' : 'LEFT';
                    if (errorX < -0.8) targetDirection = isSouthBound ? 'LEFT' : 'RIGHT';
                }
            }

            // --- Sensor Fusion: Obstacle Detection ---
            let distanceToObstacle = 100; // Infinity/Clear
            let pathClear = true;

            // For the DQN, collect 5 distinct rays of depth
            const lidarRays = [1.0, 1.0, 1.0, 1.0, 1.0]; // Far Left, Left, Center, Right, Far Right. 1.0 = Max distance
            const RAY_MAX_DIST = 20.0;

            const cosH = Math.cos(vehicle.heading);
            const sinH = Math.sin(vehicle.heading);

            // Use LiDAR to find closest point in forward path
            if (activeSensors.lidar && rawSensors.lidar?.points) {
                for (const p of rawSensors.lidar.points) {
                    // Ignore points very close to the ground (e.g. the road surface)
                    if (p.y < 0.5) continue;

                    const relX = p.x - vx;
                    const relZ = p.z - vz;

                    // Convert to local relative space (positive Z is straight ahead)
                    const localX = relX * cosH - relZ * sinH;
                    const localZ = -relX * sinH - relZ * cosH;

                    // Is the point in front of us and within our lane or immediate boundary?
                    // Vehicle is 1.8m wide. Check within a slightly wider 3.0m berth (1.5m half-width)
                    if (localZ > 1.5 && Math.abs(localX) < 1.5) {
                        const dist = Math.sqrt(localX * localX + localZ * localZ);
                        if (dist < distanceToObstacle) {
                            distanceToObstacle = dist;
                        }
                    }

                    // Bin the points for the DQN Neural Network
                    if (localZ > 0 && localZ < RAY_MAX_DIST) {
                        const distNormalized = Math.min(1.0, localZ / RAY_MAX_DIST);
                        if (localX < -3.0 && localX > -6.0) lidarRays[0] = Math.min(lidarRays[0], distNormalized); // Far Left
                        else if (localX < -1.0 && localX >= -3.0) lidarRays[1] = Math.min(lidarRays[1], distNormalized); // Left
                        else if (Math.abs(localX) <= 1.0) lidarRays[2] = Math.min(lidarRays[2], distNormalized); // Center
                        else if (localX > 1.0 && localX <= 3.0) lidarRays[3] = Math.min(lidarRays[3], distNormalized); // Right
                        else if (localX > 3.0 && localX < 6.0) lidarRays[4] = Math.min(lidarRays[4], distNormalized); // Far Right
                    }
                }
            }

            if (distanceToObstacle < 15) {
                pathClear = false;
            }

            // --- Simple overtake state machine ---
            // Prevent left-right weaving by committing to a chosen side
            // while passing around a blocking obstacle.
            const ot = overtakeState.current;
            if (inIntersection) {
                // Never maintain an overtake state inside intersections.
                ot.inOvertake = false;
                ot.side = null;
            } else {
                if (!ot.inOvertake) {
                    // Start an overtake when the path ahead is blocked at short range.
                    if (!pathClear && distanceToObstacle < 18) {
                        let chosenSide = null;
                        if (targetDirection === 'LEFT' || targetDirection === 'RIGHT') {
                            chosenSide = targetDirection;
                        } else {
                            // Default to passing on the left if no clear hint.
                            chosenSide = 'LEFT';
                        }
                        ot.inOvertake = true;
                        ot.side = chosenSide;
                    }
                } else {
                    // End overtake once the obstacle is well behind / path clear again.
                    if (pathClear && distanceToObstacle > 25) {
                        ot.inOvertake = false;
                        ot.side = null;
                    }
                }
            }

            let approachingRedLight = false;
            let approachingStopSign = false;
            let distanceToIntersection = 100;
            // Pedestrian awareness
            let pedestrianInCrosswalk = false;      // any crosswalk pedestrian (nearby)
            let pedestrianInMyPath = false;         // pedestrian in ego lane / path
            let pedestriansNearby = 0;              // count of pedestrians detected around intersection
            let emergencySirenHeard = false;

            let seeStopSign = false;

            // --- Sensor Fusion: Camera CV ---
            if (activeSensors.camera && rawSensors.camera?.views?.main) {
                for (const det of rawSensors.camera.views.main) {
                    // det.x is viewport x, where 0.5 is center. Use this to
                    // decide whether a signal/light applies to the ego lane.
                    const centerX = det.x + (det.w || 0) / 2;

                    // For intersection control, require that the traffic light is reasonably
                    // centered in the field of view and high enough confidence to avoid
                    // phantom braking from side-facing lights.
                    if ((det.label === 'T-RED' || det.label === 'T-YELLOW') && det.confidence > 0.6) {
                        if (centerX > 0.35 && centerX < 0.65 && det.distance < 80) {
                            approachingRedLight = true; // Map both to "must stop" logic
                            if (det.distance < distanceToIntersection) {
                                distanceToIntersection = det.distance;
                            }
                        }
                    } else if (det.label === 'STOP-SIGN' && det.confidence > 0.6) {
                        if (centerX > 0.35 && centerX < 0.65) {
                            seeStopSign = true;
                            if (det.distance < distanceToIntersection) {
                                distanceToIntersection = det.distance;
                            }
                        }
                    } else if (det.label === 'PERSON' && det.confidence > 0.5) {
                        // Track all visible pedestrians for context
                        pedestriansNearby += 1;

                        // Only consider pedestrians a direct lane threat if they are centered and close.
                        // Use a narrow band around screen center to avoid pedestrians standing on sidewalks
                        // or side-lanes from triggering a full stop.
                        if (det.distance < 15 && centerX > 0.45 && centerX < 0.55) {
                            pedestrianInMyPath = true;
                        }
                    }
                }
            }

            // --- Stop Sign Yielding Logic ---
            if (seeStopSign && distanceToIntersection < 12) {
                if (vehicle.speed < 0.5) {
                    stopSignTracker.current.isStopped = true;
                    stopSignTracker.current.timeStopped += 0.1; // 100ms interval
                }

                // If we haven't yielded for at least 2 seconds, keep stopping
                if (!stopSignTracker.current.isStopped || stopSignTracker.current.timeStopped < 2.0) {
                    approachingStopSign = true;
                }
            } else if (!seeStopSign && distanceToIntersection > 15) {
                // Reset tracker when we've cleared the intersection
                stopSignTracker.current.isStopped = false;
                stopSignTracker.current.timeStopped = 0;
            }

            // --- Sensor Fusion: Thermal IR ---
            // Thermal can spot pedestrians even if camera confidence is low (e.g. at night or fog)
            if (activeSensors.thermal && rawSensors.thermal?.blobs) {
                for (const blob of rawSensors.thermal.blobs) {
                    // Typical human thermal signature is ~36C. If a blob is hot and roughly human sized, 
                    // or explicitly typed as pedestrian, consider it a crosswalk threat.
                    if (blob.type === 'pedestrian' || (blob.temp >= 34 && blob.temp <= 38 && blob.boundsH < 3)) {
                        pedestriansNearby += 1;

                        // Narrow path check: close to lane center and within short distance ahead.
                        // Use a tighter lateral threshold so pedestrians standing on the sidewalk
                        // beside the lane do not count as "in path".
                        if (Math.abs(blob.relX) < 1.0 && blob.relZ > 0 && blob.relZ < 15) {
                            pedestrianInMyPath = true;
                        }
                    }
                }
            }

            // --- Sensor Fusion: Audio ---
            // Audio warns of approaching emergency vehicles out of sight
            if (activeSensors.audio && rawSensors.audio?.sources) {
                for (const src of rawSensors.audio.sources) {
                    if (src.label === 'SIREN' || src.type === 'siren' || src.priority === 6) {
                        if (src.distance < 60) {
                            emergencySirenHeard = true;
                        }
                    }
                }
            }

            // Construct a unified world state from our game data for the AI to reason about
            // Convert zone speed limit from MPH to m/s 
            const zoneSpeedLimitMps = (SPEED_LIMITS[vehicle.currentZone] || 35) * 0.44704;

            // Approximate a scalar visibility score (0–1) from time of day and weather
            let visibility = 1.0;
            if (sensors.timeOfDay === 'dusk') visibility = 0.7;
            if (sensors.timeOfDay === 'night') visibility = 0.4;
            if (sensors.weather === 'fog') visibility -= 0.3;
            if (sensors.weather === 'rain') visibility -= 0.2;
            visibility = Math.max(0, Math.min(1, visibility));

            // Derive a simple "any pedestrians" flag for backwards compatibility / UI,
            // while keeping a stricter "in my path" flag for safety overrides and RL.
            if (pedestriansNearby > 0) {
                pedestrianInCrosswalk = true;
            }

            const worldState = {
                speed: vehicle.speed,
                pathClear,
                alignedWithWaypoint,
                speedLimit: zoneSpeedLimitMps,
                // If we are in a committed overtake, expose that as the steering
                // target so the AIDriver can honor it consistently.
                targetDirection: ot.inOvertake && ot.side ? ot.side : targetDirection,
                distanceToObstacle,
                approachingRedLight,
                approachingStopSign,
                distanceToIntersection,
                pedestrianInCrosswalk,
                pedestrianInMyPath,
                pedestriansNearby,
                emergencySirenHeard,
                inIntersection,
                inOvertake: ot.inOvertake,
                overtakeSide: ot.side,
                // Additional context for DQN state vector
                zoneIsSchool: vehicle.currentZone === 'school',
                visibility,
            };

            // Package normalized inputs for Neural Network execution
            const dqnState = {
                normalizedSpeed: Math.min(1.0, Math.max(0.0, vehicle.speed / zoneSpeedLimitMps)),
                crossTrackError: Math.min(1.0, Math.max(-1.0, crossTrackErrorRaw / 3.0)), // normalize to roughly -1 to 1 based on lane width
                headingError: headingErrorNormalized,
                inIntersection: inIntersection ? 1.0 : 0.0,
                lidarRays: lidarRays
            };

            // 1. Tick the AI Engine
            const result = await driverRef.current.tick(rawSensors, activeSensors, worldState, dqnState);
            if (result) {
                // 2. Publish results to the Glass Box UI
                useAIStore.getState().updateGlassboxData(result);

                // 3. Command the physical vehicle
                const setInput = useVehicleStore.getState().setInput;

                // Reset inputs
                setInput('accelerate', false);
                setInput('brake', false);
                setInput('steerLeft', false);
                setInput('steerRight', false);

                // Map AI actions to keyboard-equivalent physics inputs
                if (result.action === 'STRAIGHT' || result.action === 'ACCELERATE') {
                    setInput('accelerate', true);
                } else if (result.action === 'BRAKE' || result.action === 'EMERGENCY_BRAKE') {
                    // Always try to steer towards the waypoint even while braking to stay on the road during a corner
                    if (targetDirection === 'LEFT') setInput('steerLeft', true);
                    if (targetDirection === 'RIGHT') setInput('steerRight', true);
                    setInput('brake', true);
                } else if (result.action === 'STOP') {
                    setInput('brake', true);
                } else if (result.action === 'LEFT') {
                    setInput('steerLeft', true);
                    if (vehicle.speed < 12) setInput('accelerate', true); // Coast through the turn if going too fast
                } else if (result.action === 'RIGHT') {
                    setInput('steerRight', true);
                    if (vehicle.speed < 12) setInput('accelerate', true); // Coast through the turn if going too fast
                }
            }
        }, 100); // AI Brain ticks at 10Hz

        return () => {
            clearInterval(interval);
            // Clear inputs on unmount
            const setInput = useVehicleStore.getState().setInput;
            setInput('accelerate', false);
            setInput('brake', false);
            setInput('steerLeft', false);
            setInput('steerRight', false);
        };
    }, [enabled]);

    return null;
}
