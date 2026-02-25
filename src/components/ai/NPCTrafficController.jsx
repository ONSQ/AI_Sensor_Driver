import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as YUKA from 'yuka';
import NPCManager from '../../ai/NPCManager.js';
import NPCVehicle from '../../ai/NPCVehicle.js';

export default function NPCTrafficController() {
    const meshRef = useRef(null);
    const vehicleRef = useRef(null);

    useEffect(() => {
        // Setup Yuka Vehicle
        const vehicle = new NPCVehicle(meshRef.current);
        vehicle.position.set(0, 0.5, 30); // Start 30m away

        // Add Wander Behavior
        const wanderBehavior = new YUKA.WanderBehavior(5, 5, 2);
        wanderBehavior.weight = 1.0;
        vehicle.steering.add(wanderBehavior);

        NPCManager.add(vehicle);
        vehicleRef.current = vehicle;

        return () => {
            NPCManager.remove(vehicle);
        };
    }, []);

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
