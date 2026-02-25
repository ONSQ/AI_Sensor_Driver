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

            if (game.waypoints.length > 0 && game.currentWaypointIndex < game.waypoints.length) {
                const wp = game.waypoints[game.currentWaypointIndex];
                const [vx, , vz] = vehicle.position;
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
                        if (Math.abs(dx) > 10) {
                            targetDz = 0; // Lock Z to current lane, drive straight along X
                        }
                    } else {
                        if (Math.abs(dz) > 10) {
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

                        // Cross product Y component = fwdZ * ndx - fwdX * ndz
                        const crossY = fwdZ * ndx - fwdX * ndz;
                        // Dot product = cos of angle
                        const dot = fwdX * ndx + fwdZ * ndz;

                        // Math.atan2(y, x) -> atan2(cross, dot) gives -PI to PI
                        const relativeAngle = Math.atan2(crossY, dot);
                        const angleDeg = relativeAngle * (180 / Math.PI);

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

            // --- Lane Centering Override ---
            // If we are heading roughly along an axis (not in the middle of a sharp turn), ensure we stay in the center of the right lane
            const isHeadingX = Math.abs(Math.sin(vehicle.heading)) > 0.9;
            const isHeadingZ = Math.abs(Math.cos(vehicle.heading)) > 0.9;
            const laneOffset = 1.5; // Centers of lanes are offset 1.5m from road center

            // Only apply lane centering if we are actually generally aligned with a road axis
            if (isHeadingX) {
                // Moving East/West: Keep Z near 1.5 (Eastbound) or -1.5 (Westbound)
                const targetZ = Math.cos(vehicle.heading) < 0 ? laneOffset : -laneOffset;
                const errorZ = vehicle.position[2] - targetZ;

                // If we drift too far from the center of the lane, gently steer back
                if (errorZ > 0.5) {
                    targetDirection = 'RIGHT';
                } else if (errorZ < -0.5) {
                    targetDirection = 'LEFT';
                }
            } else if (isHeadingZ) {
                // Moving North/South: Keep X near 1.5 (Southbound) or -1.5 (Northbound)
                const targetX = Math.sin(vehicle.heading) < 0 ? laneOffset : -laneOffset;
                const errorX = vehicle.position[0] - targetX;

                if (errorX > 0.5) {
                    targetDirection = 'LEFT';
                } else if (errorX < -0.5) {
                    targetDirection = 'RIGHT';
                }
            }

            // --- Sensor Fusion: Obstacle Detection ---
            let distanceToObstacle = 100; // Infinity/Clear
            let pathClear = true;

            const vx = vehicle.position[0];
            const vz = vehicle.position[2];
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

                    // Is the point in front of us and within our lane?
                    // Vehicle is 1.8m wide. Check within a slightly wider 2.2m berth (1.1m half-width)
                    if (localZ > 2.5 && Math.abs(localX) < 1.1) {
                        const dist = Math.sqrt(localX * localX + localZ * localZ);
                        if (dist < distanceToObstacle) {
                            distanceToObstacle = dist;
                        }
                    }
                }
            }

            if (distanceToObstacle < 15) {
                pathClear = false;
            }

            let approachingRedLight = false;
            let approachingStopSign = false;
            let distanceToIntersection = 100;
            let pedestrianInCrosswalk = false;
            let emergencySirenHeard = false;

            let seeStopSign = false;

            // --- Sensor Fusion: Camera CV ---
            if (activeSensors.camera && rawSensors.camera?.views?.main) {
                for (const det of rawSensors.camera.views.main) {
                    // For intersection control, require decent confidence to avoid phantom braking
                    if ((det.label === 'T-RED' || det.label === 'T-YELLOW') && det.confidence > 0.6) {
                        approachingRedLight = true; // Map both to "must stop" logic
                        if (det.distance < distanceToIntersection) {
                            distanceToIntersection = det.distance;
                        }
                    } else if (det.label === 'STOP-SIGN' && det.confidence > 0.6) {
                        seeStopSign = true;
                        if (det.distance < distanceToIntersection) {
                            distanceToIntersection = det.distance;
                        }
                    } else if (det.label === 'PERSON' && det.confidence > 0.5) {
                        // For this basic simulation, any person centered in the camera is considered a crossing threat
                        if (det.distance < 30) {
                            pedestrianInCrosswalk = true;
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
                        // Calculate Manhattan-ish distance from relative coordinates
                        const relDist = Math.abs(blob.relX) + Math.abs(blob.relZ);
                        if (relDist < 25 && blob.relZ > 0) {
                            pedestrianInCrosswalk = true;
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

            const worldState = {
                speed: vehicle.speed,
                pathClear,
                alignedWithWaypoint,
                speedLimit: zoneSpeedLimitMps,
                targetDirection,
                distanceToObstacle,
                approachingRedLight,
                approachingStopSign,
                distanceToIntersection,
                pedestrianInCrosswalk,
                emergencySirenHeard,
            };

            // 1. Tick the AI Engine
            const result = await driverRef.current.tick(rawSensors, activeSensors, worldState);
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
