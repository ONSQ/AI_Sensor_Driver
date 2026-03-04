import React, { useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Plane } from 'three';
import useWaypointStore from '../../stores/useWaypointStore';

export default function WaypointDesigner() {
    const isDesignerMode = useWaypointStore((s) => s.isDesignerMode);
    const customWaypoints = useWaypointStore((s) => s.customWaypoints);
    const addWaypoint = useWaypointStore((s) => s.addWaypoint);
    const planeRef = useRef(new Plane(new Vector3(0, 1, 0), 0));
    const { camera, raycaster, pointer } = useThree();

    // Invisible plane covering the whole world to catch clicks
    const handlePointerDown = (e) => {
        if (!isDesignerMode) return;

        // Stop the click from panning/rotating the camera in OrbitControls if needed
        e.stopPropagation();

        raycaster.setFromCamera(pointer, camera);
        const intersectPoint = new Vector3();
        raycaster.ray.intersectPlane(planeRef.current, intersectPoint);

        if (intersectPoint) {
            addWaypoint([intersectPoint.x, 0.5, intersectPoint.z]); // Slightly above ground
        }
    };

    if (!isDesignerMode && customWaypoints.length === 0) return null;

    return (
        <group>
            {/* Catch clicks if we are in designer mode */}
            {isDesignerMode && (
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.1, 0]}
                    onPointerDown={handlePointerDown}
                    visible={false} // Invisible click catcher
                >
                    <planeGeometry args={[1000, 1000]} />
                    <meshBasicMaterial />
                </mesh>
            )}

            {/* Render Waypoint Spheres */}
            {customWaypoints.map((wp, i) => (
                <mesh key={wp.id} position={wp.position}>
                    <sphereGeometry args={[0.5, 16, 16]} />
                    <meshStandardMaterial color={i === 0 ? "#10b981" : "#fbbf24"} emissive={i === 0 ? "#10b981" : "#fbbf24"} emissiveIntensity={0.5} />
                </mesh>
            ))}

            {/* Render Connecting Lines */}
            {customWaypoints.length > 1 && (
                <line>
                    <bufferGeometry attach="geometry">
                        <float32BufferAttribute
                            attach="attributes-position"
                            args={[new Float32Array(customWaypoints.flatMap(wp => wp.position)), 3]}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial attach="material" color="#3b82f6" linewidth={5} opacity={0.6} transparent />
                </line>
            )}
        </group>
    );
}
