import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import { useRef, useState } from 'react';

function SpinningCube() {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useFrame((state, delta) => {
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.8;
  });

  return (
    <mesh
      ref={meshRef}
      scale={clicked ? 1.5 : 1}
      onClick={() => setClicked(!clicked)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? '#ff6600' : '#00ff88'} />
    </mesh>
  );
}

function Placeholder() {
  return (
    <Html center>
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        color: '#00ff88',
        padding: '20px 30px',
        borderRadius: '8px',
        border: '1px solid rgba(0,255,136,0.3)',
        fontFamily: 'monospace',
        fontSize: '14px',
        whiteSpace: 'nowrap',
      }}>
        SensorRacer v2 — Scaffolding OK
      </div>
    </Html>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [3, 3, 3], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#1a1a2e']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <SpinningCube />
        <Placeholder />
        <Grid
          infiniteGrid
          fadeDistance={30}
          fadeStrength={5}
          cellSize={1}
          sectionSize={4}
          cellColor="#333"
          sectionColor="#00ff88"
        />
        <OrbitControls makeDefault />
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
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>SENSORRACER v2</div>
        <div>Three.js + React + Vite</div>
        <div>Click cube to scale | Hover to change color</div>
      </div>
    </div>
  );
}
