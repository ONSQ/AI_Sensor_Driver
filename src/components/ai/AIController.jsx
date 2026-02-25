import { useEffect, useRef } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import useAIStore from '../../stores/useAIStore.js';
import { AIDriver } from '../../ai/AIDriver.js';

export default function AIController({ enabled = true }) {
    const driverRef = useRef(null);

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

            const activeSensors = {
                lidar: sensors.sensors.lidar.enabled,
                thermal: sensors.sensors.thermal.enabled,
                camera: sensors.sensors.camera.enabled,
                audio: sensors.sensors.audio.enabled,
            };

            // Construct a unified world state from our game data for the AI to reason about
            const worldState = {
                speed: vehicle.speed,
                // Mock data to be replaced with real detection logic in the future
                pathClear: true,
                alignedWithWaypoint: true,
                speedLimit: 35,
                targetDirection: 'STRAIGHT',
                distanceToObstacle: 10,
                approachingRedLight: false,
                distanceToIntersection: 0,
                pedestrianInCrosswalk: false,
            };

            const rawSensors = {
                lidar: sensors.lidarData,
                thermal: sensors.thermalData,
                camera: sensors.cameraData,
                audio: sensors.audioData
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
                } else if (result.action === 'BRAKE' || result.action === 'EMERGENCY_BRAKE' || result.action === 'STOP') {
                    setInput('brake', true);
                } else if (result.action === 'LEFT') {
                    setInput('steerLeft', true);
                    setInput('accelerate', true);
                } else if (result.action === 'RIGHT') {
                    setInput('steerRight', true);
                    setInput('accelerate', true);
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
