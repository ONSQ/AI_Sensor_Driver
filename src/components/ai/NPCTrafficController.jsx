import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as YUKA from 'yuka';
import NPCManager from '../../ai/NPCManager.js';
import NPCVehicle from '../../ai/NPCVehicle.js';

export default function NPCTrafficController({ collisionData }) {
    const meshRef = useRef(null);
    const vehicleRef = useRef(null);

    useEffect(() => {
        if (!collisionData) return;

        // Setup Yuka Vehicle
        const vehicle = new NPCVehicle(meshRef.current);
        vehicle.position.set(0, 0.5, 30); // Start 30m away

        // Create obstacles from collisionData buildings
        const obstacles = [];
        if (collisionData.byBlock) {
            Object.values(collisionData.byBlock).flat().forEach((obj) => {
                if (obj.type === 'building') {
                    const cx = (obj.minX + obj.maxX) / 2;
                    const cz = (obj.minZ + obj.maxZ) / 2;
                    // Use the smaller dimension for conservative radius so we don't block roads
                    const r = Math.min(obj.maxX - obj.minX, obj.maxZ - obj.minZ) * 0.7;
                    const obstacle = new YUKA.GameEntity();
                    obstacle.position.set(cx, 0, cz);
                    obstacle.boundingRadius = r;
                    obstacles.push(obstacle);
                }
            });
        }

        // Add Obstacle Avoidance Behavior
        const obstacleBehavior = new YUKA.ObstacleAvoidanceBehavior(obstacles);
        obstacleBehavior.weight = 3.0; // High priority
        vehicle.steering.add(obstacleBehavior);

        // Add Wander Behavior
        const wanderBehavior = new YUKA.WanderBehavior(5, 5, 2);
        wanderBehavior.weight = 1.0;
        vehicle.steering.add(wanderBehavior);

        NPCManager.add(vehicle);
        vehicleRef.current = vehicle;

        return () => {
            NPCManager.remove(vehicle);
        };
    }, [collisionData]);

    useFrame(() => {
        NPCManager.update();
        if (vehicleRef.current) {
            vehicleRef.current.update();
        }
    });

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[2, 1.5, 4.5]} />
            <meshStandardMaterial color="orange" />
        </mesh>
    );
}
