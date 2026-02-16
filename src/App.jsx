import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';
import CityWorld from './components/world/CityWorld.jsx';
import useGameStore from './stores/useGameStore.js';

export default function App() {
  const seed = useGameStore((s) => s.seed);
  const setSeed = useGameStore((s) => s.setSeed);

  // Debug controls — change seed to regenerate the world
  const { Seed: debugSeed } = useControls('World', {
    Seed: { value: seed, min: 0, max: 99999, step: 1 },
  });

  // Sync leva control to store
  if (debugSeed !== seed) {
    setSeed(debugSeed);
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 150, 150], fov: 50 }}
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

        {/* World */}
        <CityWorld seed={debugSeed} />

        {/* Camera controls */}
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.1}
          minDistance={20}
          maxDistance={350}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* HUD overlay */}
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
        <div>Scroll to zoom | Drag to orbit</div>
      </div>
    </div>
  );
}
