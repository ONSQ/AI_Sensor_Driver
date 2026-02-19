import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';
import CityWorld from './components/world/CityWorld.jsx';
import useGameStore from './stores/useGameStore.js';
import useVehicleStore from './stores/useVehicleStore.js';
import FirstPersonCamera from './components/vehicle/FirstPersonCamera.jsx';
import ThirdPersonCamera from './components/vehicle/ThirdPersonCamera.jsx';
import RearviewMirror from './components/vehicle/RearviewMirror.jsx';
import InputHandler from './components/vehicle/InputHandler.jsx';
import CockpitHUD from './components/ui/CockpitHUD.jsx';
import WaypointCompass from './components/ui/WaypointCompass.jsx';
import LidarPanel from './components/sensors/LidarPanel.jsx';
import ThermalPanel from './components/sensors/ThermalPanel.jsx';
import AudioPanel from './components/sensors/AudioPanel.jsx';
import CameraOverlay from './components/sensors/CameraOverlay.jsx';
import SensorStatusBar from './components/sensors/SensorStatusBar.jsx';
import useSensorStore from './stores/useSensorStore.js';
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
    'Camera Mode': { options: ['orbit', 'third-person', 'first-person'], value: 'orbit' },
  });

  // Sensor controls
  const { 'LiDAR Rays': lidarRays, Weather: weather, 'Time of Day': timeOfDay } = useControls('Sensors', {
    'LiDAR Rays': { options: [24, 48, 72], value: 48 },
    'Weather': { options: ['clear', 'rain', 'fog'], value: 'clear' },
    'Time of Day': { options: ['daylight', 'dusk', 'night'], value: 'daylight' },
  });

  // Sync leva control to store
  if (debugSeed !== seed) {
    setSeed(debugSeed);
  }

  // Sync sensor controls to store
  const sensorState = useSensorStore.getState();
  if (sensorState.sensors.lidar.rayCount !== lidarRays) sensorState.setLidarRayCount(lidarRays);
  if (sensorState.weather !== weather) sensorState.setWeather(weather);
  if (sensorState.timeOfDay !== timeOfDay) sensorState.setTimeOfDay(timeOfDay);

  const isFirstPerson = cameraMode === 'first-person';
  const isThirdPerson = cameraMode === 'third-person';
  const isOrbit = cameraMode === 'orbit';

  // Sync camera FOV to sensor store for CV main overlay
  const gameFov = isFirstPerson ? CAMERA.FIRST_PERSON_FOV : CAMERA.THIRD_PERSON_FOV;
  if (sensorState.mainCameraFov !== gameFov) sensorState.setMainCameraFov(gameFov);

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

        {/* Camera controllers — only one active at a time */}
        <FirstPersonCamera enabled={isFirstPerson} />
        <ThirdPersonCamera enabled={isThirdPerson} />
        {isOrbit && <VehicleOrbitControls />}

        {/* Rearview mirror (first-person only) */}
        <RearviewMirror enabled={isFirstPerson} />
      </Canvas>

      {/* Keyboard input handler (always active) */}
      <InputHandler />

      {/* Cockpit HUD (first-person + third-person) */}
      <CockpitHUD visible={!isOrbit} />

      {/* Waypoint compass (first-person + third-person) */}
      <WaypointCompass visible={!isOrbit} />

      {/* Sensor overlays (first-person + third-person) */}
      <LidarPanel visible={!isOrbit} />
      <ThermalPanel visible={!isOrbit} />
      <AudioPanel visible={!isOrbit} />
      <CameraOverlay visible={!isOrbit} />
      <SensorStatusBar visible={!isOrbit} />

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
        <div>{isOrbit ? 'Scroll to zoom | Drag to orbit' : 'WASD to drive'}</div>
      </div>
    </div>
  );
}
