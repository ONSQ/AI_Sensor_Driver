import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as YUKA from 'yuka';
import NPCManager from '../../ai/NPCManager.js';
import NPCVehicle from '../../ai/NPCVehicle.js';
import useTrafficStore from '../../stores/useTrafficStore.js';
import { generateRandomLoop } from '../../ai/NPCRoutePlanner.js';

export default function NPCTrafficController({ collisionData }) {
    const meshRef = useRef(null);
    const vehicleRef = useRef(null);

    useEffect(() => {
        if (!collisionData) return;

        // Setup Yuka Vehicle
        const vehicle = new NPCVehicle(meshRef.current);
        vehicle.maxSpeed = 10;

        // Obstacle avoidance removed because it forces perfectly-aligned NPCs off the road and into buildings.
        // NPCs will now strictly follow their generated routes to avoid collisions.

        // Add Path Following Behavior
        const path = generateRandomLoop();

        // Start position at the beginning of the path
        vehicle.position.copy(path.current());
        if (path._waypoints.length > 1) {
            vehicle.lookAt(path._waypoints[1]);
        }

        const onPathBehavior = new YUKA.OnPathBehavior(path, 0.5, 0.1);
        onPathBehavior.weight = 1.0;
        vehicle.steering.add(onPathBehavior);

        const followPathBehavior = new YUKA.FollowPathBehavior(path, 2.0);
        followPathBehavior.weight = 1.0;
        vehicle.steering.add(followPathBehavior);

        vehicle.targetPath = path;

        NPCManager.add(vehicle);
        vehicleRef.current = vehicle;

        return () => {
            NPCManager.remove(vehicle);
        };
    }, [collisionData]);

    useFrame(() => {
        try {
            NPCManager.update();
            if (vehicleRef.current) {
                const vehicle = vehicleRef.current;
                const path = vehicle.targetPath;

                if (path) {
                    // Check traffic lights before intersection
                    const nextWaypoint = path.current();
                    const dist = vehicle.position.distanceTo(nextWaypoint);

                    let shouldStop = false;

                    if (dist < 15) {
                        const heading = vehicle.velocity.clone().normalize();
                        const isEW = Math.abs(heading.x) > Math.abs(heading.z);
                        const axis = isEW ? 'ew' : 'ns';

                        const trafficStore = useTrafficStore.getState();
                        if (trafficStore.isRed(axis)) {
                            shouldStop = true;
                        }
                    }

                    if (shouldStop) {
                        vehicle.maxSpeed = Math.max(0, vehicle.maxSpeed - 0.5);
                    } else {
                        vehicle.maxSpeed = Math.min(10, vehicle.maxSpeed + 0.2);
                    }
                }

                vehicle.update();
            }
        } catch (error) {
            console.error("Error in NPCTrafficController useFrame:", error);
        }
    });

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[2, 1.5, 4.5]} />
            <meshStandardMaterial color="orange" />
        </mesh>
    );
}
