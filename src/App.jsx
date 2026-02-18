import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';
import CityWorld from './components/world/CityWorld.jsx';
import useGameStore from './stores/useGameStore.js';
import useVehicleStore from './stores/useVehicleStore.js';
import FirstPersonCamera from './components/vehicle/FirstPersonCamera.jsx';
import InputHandler from './components/vehicle/InputHandler.jsx';
import CockpitHUD from './components/ui/CockpitHUD.jsx';
import { CAMERA } from './constants/vehicle.js';

/**
 * OrbitControls that follows the vehicle position.
 * Updates the controls target each frame so the camera orbits around the car.
 */
function VehicleOrbitControls() {
  const controlsRef = useRef();

  useFrame(() => {
    if (!controlsRef.current) return;
    const [x, , z] = useVehicleStore.getState().position;
    controlsRef.current.target.set(x, 0, z);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      maxPolarAngle={Math.PI / 2.1}
      minDistance={10}
      maxDistance={200}
    />
  );
}

export default function App() {
  const seed = useGameStore((s) => s.seed);
  const setSeed = useGameStore((s) => s.setSeed);

  // Debug controls — change seed to regenerate the world
  const { Seed: debugSeed } = useControls('World', {
    Seed: { value: seed, min: 0, max: 99999, step: 1 },
  });

  // Camera mode toggle
  const { 'Camera Mode': cameraMode } = useControls('Camera', {
    'Camera Mode': { options: ['orbit', 'first-person'], value: 'orbit' },
  });

  // Sync leva control to store
  if (debugSeed !== seed) {
    setSeed(debugSeed);
  }

  const isFirstPerson = cameraMode === 'first-person';

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{
          position: isFirstPerson ? [0, 1.5, 0] : [0, 150, 150],
          fov: isFirstPerson ? CAMERA.FIRST_PERSON_FOV : CAMERA.ORBIT_FOV,
        }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        shadows
      >
        <color attach="background" args={['#0a0a1a']} />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[80, 120, 60]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-120}
          shadow-camera-right={120}
          shadow-camera-top={120}
          shadow-camera-bottom={-120}
          shadow-camera-near={1}
          shadow-camera-far={300}
        />
        <hemisphereLight
          color="#b1e1ff"
          groundColor="#1a1a2e"
          intensity={0.2}
        />

        {/* World + Vehicle */}
        <CityWorld seed={debugSeed} cameraMode={cameraMode} />

        {/* First-person camera (takes over when active) */}
        <FirstPersonCamera enabled={isFirstPerson} />

        {/* Orbit controls — follows vehicle (only in orbit mode) */}
        {!isFirstPerson && <VehicleOrbitControls />}
      </Canvas>

      {/* Keyboard input handler (always active) */}
      <InputHandler />

      {/* Cockpit HUD (first-person only) */}
      <CockpitHUD visible={isFirstPerson} />

      {/* Debug HUD overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: '#00ff88',
        fontFamily: 'monospace',
        fontSize: '12px',
        background: 'rgba(0,0,0,0.7)',
        padding: '12px 16px',
        borderRadius: '6px',
        border: '1px solid rgba(0,255,136,0.3)',
        pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>SENSORRACER v2</div>
        <div>Seed: {debugSeed}</div>
        <div>{isFirstPerson ? 'WASD to drive' : 'Scroll to zoom | Drag to orbit'}</div>
      </div>
    </div>
  );
}
