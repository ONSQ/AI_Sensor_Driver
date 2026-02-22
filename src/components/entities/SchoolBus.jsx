import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCHOOL_BUS } from '../../constants/entities.js';

const WHEEL_RAD = 0.5;
const WHEEL_W = 0.3;
const WHEEL_X_OFFSET = SCHOOL_BUS.BODY_WIDTH / 2 + 0.05;
const WHEEL_Z_OFFSET = SCHOOL_BUS.BODY_LENGTH / 2 - 1.2;

const geoBox = new THREE.BoxGeometry(1, 1, 1);
const geoWheel = new THREE.CylinderGeometry(WHEEL_RAD, WHEEL_RAD, WHEEL_W, 16);
const matWheel = new THREE.MeshStandardMaterial({ color: '#111' });

export default function SchoolBus({ entity }) {
    const bodyY = SCHOOL_BUS.BODY_Y_OFFSET + SCHOOL_BUS.BODY_HEIGHT / 2;
    const cabinY = SCHOOL_BUS.BODY_Y_OFFSET + SCHOOL_BUS.BODY_HEIGHT + SCHOOL_BUS.CABIN_HEIGHT / 2;

    const groupRef = useRef();

    // Headlights & brake lights logic
    const isMoving = entity.speed > 0;
    const brakeOn = entity.speed < 1;

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
            groupRef.current.rotation.set(0, entity.heading + Math.PI, 0);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Main body - Yellow */}
            <mesh position={[0, bodyY + 0.2, 0]} castShadow receiveShadow geometry={geoBox}>
                <meshStandardMaterial color={entity.color} roughness={0.7} />
                <boxGeometry args={[SCHOOL_BUS.BODY_WIDTH, SCHOOL_BUS.BODY_HEIGHT, SCHOOL_BUS.BODY_LENGTH]} />
            </mesh>

            {/* Front Hood (slightly lower and shorter) */}
            <mesh position={[0, bodyY - 0.2, SCHOOL_BUS.BODY_LENGTH / 2 + 0.5]} castShadow receiveShadow geometry={geoBox}>
                <meshStandardMaterial color={entity.color} roughness={0.7} />
                <boxGeometry args={[SCHOOL_BUS.BODY_WIDTH * 0.9, SCHOOL_BUS.BODY_HEIGHT * 0.6, 1.0]} />
            </mesh>

            {/* Cabin / windshield area */}
            <mesh position={[0, cabinY, 0.5]} castShadow geometry={geoBox}>
                <meshStandardMaterial color="#88aaff" transparent opacity={0.6} roughness={0.1} />
                <boxGeometry args={[SCHOOL_BUS.CABIN_WIDTH * 0.9, SCHOOL_BUS.CABIN_HEIGHT, SCHOOL_BUS.CABIN_LENGTH]} />
            </mesh>

            {/* Wheels */}
            <mesh position={[WHEEL_X_OFFSET, WHEEL_RAD, WHEEL_Z_OFFSET + 1]} rotation={[0, 0, Math.PI / 2]} geometry={geoWheel} material={matWheel} castShadow />
            <mesh position={[-WHEEL_X_OFFSET, WHEEL_RAD, WHEEL_Z_OFFSET + 1]} rotation={[0, 0, Math.PI / 2]} geometry={geoWheel} material={matWheel} castShadow />
            <mesh position={[WHEEL_X_OFFSET, WHEEL_RAD, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} geometry={geoWheel} material={matWheel} castShadow />
            <mesh position={[-WHEEL_X_OFFSET, WHEEL_RAD, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} geometry={geoWheel} material={matWheel} castShadow />

            {/* Headlights */}
            <mesh position={[SCHOOL_BUS.BODY_WIDTH / 2 - 0.3, bodyY - 0.2, SCHOOL_BUS.BODY_LENGTH / 2 + 1.01]}>
                <boxGeometry args={[0.3, 0.3, 0.05]} />
                <meshStandardMaterial color={isMoving ? '#ffffee' : '#333'} emissive={isMoving ? '#ffffee' : '#000'} emissiveIntensity={2} />
            </mesh>
            <mesh position={[-SCHOOL_BUS.BODY_WIDTH / 2 + 0.3, bodyY - 0.2, SCHOOL_BUS.BODY_LENGTH / 2 + 1.01]}>
                <boxGeometry args={[0.3, 0.3, 0.05]} />
                <meshStandardMaterial color={isMoving ? '#ffffee' : '#333'} emissive={isMoving ? '#ffffee' : '#000'} emissiveIntensity={2} />
            </mesh>

            {/* Taillights */}
            <mesh position={[SCHOOL_BUS.BODY_WIDTH / 2 - 0.4, bodyY, -SCHOOL_BUS.BODY_LENGTH / 2 - 0.01]}>
                <boxGeometry args={[0.4, 0.4, 0.05]} />
                <meshStandardMaterial color={brakeOn ? '#ff0000' : '#550000'} emissive={brakeOn ? '#ff0000' : '#220000'} emissiveIntensity={brakeOn ? 2 : 0.5} />
            </mesh>
            <mesh position={[-SCHOOL_BUS.BODY_WIDTH / 2 + 0.4, bodyY, -SCHOOL_BUS.BODY_LENGTH / 2 - 0.01]}>
                <boxGeometry args={[0.4, 0.4, 0.05]} />
                <meshStandardMaterial color={brakeOn ? '#ff0000' : '#550000'} emissive={brakeOn ? '#ff0000' : '#220000'} emissiveIntensity={brakeOn ? 2 : 0.5} />
            </mesh>

            {/* Top Red Flashers */}
            <mesh position={[SCHOOL_BUS.BODY_WIDTH / 2 - 0.2, bodyY + SCHOOL_BUS.BODY_HEIGHT / 2 + 0.1, SCHOOL_BUS.BODY_LENGTH / 2]}>
                <boxGeometry args={[0.3, 0.3, 0.05]} />
                <meshStandardMaterial color="#ff0000" emissive={brakeOn ? '#ff0000' : '#000000'} emissiveIntensity={brakeOn ? 3 : 0} />
            </mesh>
            <mesh position={[-SCHOOL_BUS.BODY_WIDTH / 2 + 0.2, bodyY + SCHOOL_BUS.BODY_HEIGHT / 2 + 0.1, SCHOOL_BUS.BODY_LENGTH / 2]}>
                <boxGeometry args={[0.3, 0.3, 0.05]} />
                <meshStandardMaterial color="#ff0000" emissive={brakeOn ? '#ff0000' : '#000000'} emissiveIntensity={brakeOn ? 3 : 0} />
            </mesh>

            {/* Black Stripes (sides) */}
            <mesh position={[SCHOOL_BUS.BODY_WIDTH / 2 + 0.01, bodyY + 0.1, 0]}>
                <boxGeometry args={[0.05, 0.1, SCHOOL_BUS.BODY_LENGTH]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[-SCHOOL_BUS.BODY_WIDTH / 2 - 0.01, bodyY + 0.1, 0]}>
                <boxGeometry args={[0.05, 0.1, SCHOOL_BUS.BODY_LENGTH]} />
                <meshStandardMaterial color="#111" />
            </mesh>

        </group>
    );
}
