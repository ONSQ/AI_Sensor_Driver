import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS } from '../../constants/world.js';

// ---- Procedural Window Texture ----
const windowCanvas = document.createElement('canvas');
windowCanvas.width = 512;
windowCanvas.height = 512;
const ctx = windowCanvas.getContext('2d');
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, 512, 512);

ctx.fillStyle = '#ffffff';
for (let c = 0; c < 8; c++) {
  for (let r = 0; r < 8; r++) {
    if (Math.random() > 0.25) {
      const cx = c * 64 + 16;
      const cy = r * 64 + 8;
      ctx.fillRect(cx, cy, 32, 48);
    }
  }
}
const globalWindowTexture = new THREE.CanvasTexture(windowCanvas);
globalWindowTexture.wrapS = THREE.RepeatWrapping;
globalWindowTexture.wrapT = THREE.RepeatWrapping;
globalWindowTexture.magFilter = THREE.NearestFilter;
globalWindowTexture.colorSpace = THREE.SRGBColorSpace;

const Tier = memo(function Tier({ width, height, depth, yOffset, materials }) {
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(width, height, depth);
    const uv = g.attributes.uv;
    const norm = g.attributes.normal;

    const TEX_SCALE = 1 / 25;

    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(norm.getX(i));
      const nz = Math.abs(norm.getZ(i));

      let u = uv.getX(i);
      let v = uv.getY(i);

      if (nx > 0.5) {
        uv.setXY(i, u * (depth * TEX_SCALE), v * (height * TEX_SCALE));
      } else if (nz > 0.5) {
        uv.setXY(i, u * (width * TEX_SCALE), v * (height * TEX_SCALE));
      } else {
        uv.setXY(i, u * (width * TEX_SCALE), v * (depth * TEX_SCALE));
      }
    }
    return g;
  }, [width, height, depth]);

  return <mesh position={[0, yOffset + height / 2, 0]} castShadow receiveShadow geometry={geo} material={materials} />;
});

// A small component for roof clutter
const RoofClutter = memo(function RoofClutter({ topY, width, depth, pseudoSeed }) {
  const count = (Math.floor(pseudoSeed) % 3) + 1;
  const units = [];
  for (let i = 0; i < count; i++) {
    const s = pseudoSeed + i * 13.7;
    const w = 1 + (s % 2);
    const d = 1 + ((s * 2) % 2);
    const h = 1 + (s % 1.5);
    const x = ((s % 100) / 100 - 0.5) * (width * 0.6);
    const z = (((s * 3) % 100) / 100 - 0.5) * (depth * 0.6);
    units.push({ w, h, d, x, z });
  }

  const hasAntenna = (Math.floor(pseudoSeed) % 5 === 0) && width < 15;

  return (
    <group position={[0, topY, 0]}>
      {units.map((u, i) => (
        <mesh key={i} position={[u.x, u.h / 2, u.z]} castShadow receiveShadow>
          <boxGeometry args={[u.w, u.h, u.d]} />
          <meshStandardMaterial color="#333333" roughness={0.9} />
        </mesh>
      ))}
      {hasAntenna && (
        <mesh position={[0, 4, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.2, 8, 4]} />
          <meshStandardMaterial color="#888888" roughness={0.6} metalness={0.5} />
          {/* Beacon light */}
          <mesh position={[0, 4.1, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
          </mesh>
        </mesh>
      )}
    </group>
  );
});

const Building = memo(function Building({ position, width, height, depth, color, roofType }) {
  // Generate materials
  const materials = useMemo(() => {
    const wallMat = new THREE.MeshStandardMaterial({
      color: color,
      emissiveMap: globalWindowTexture,
      emissive: new THREE.Color('#ffcc77'),
      emissiveIntensity: 1.5,
      roughness: 0.9,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.95,
    });

    return [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat];
  }, [color]);

  // Determine Tiers (Skyscraper setbacks)
  const tiers = useMemo(() => {
    const arr = [];
    if (roofType === 'flat' && height > 30) {
      // 3 Tiers
      const h1 = height * 0.5;
      const h2 = height * 0.3;
      const h3 = height * 0.2;
      arr.push({ w: width, h: h1, d: depth, y: 0 });
      arr.push({ w: width * 0.8, h: h2, d: depth * 0.8, y: h1 });
      arr.push({ w: width * 0.5, h: h3, d: depth * 0.5, y: h1 + h2 });
    } else if (roofType === 'flat' && height > 15) {
      // 2 Tiers
      const h1 = height * 0.6;
      const h2 = height * 0.4;
      arr.push({ w: width, h: h1, d: depth, y: 0 });
      arr.push({ w: width * 0.75, h: h2, d: depth * 0.75, y: h1 });
    } else {
      // 1 Tier
      arr.push({ w: width, h: height, d: depth, y: 0 });
    }
    return arr;
  }, [width, height, depth, roofType]);

  const pseudoSeed = Math.abs(position[0] * 73 + position[2] * 31);
  const topTier = tiers[tiers.length - 1];

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Tiers */}
      {tiers.map((t, i) => (
        <Tier key={i} width={t.w} height={t.h} depth={t.d} yOffset={t.y} materials={materials} />
      ))}

      {/* Roof Clutter for flat roofs */}
      {roofType === 'flat' && (
        <RoofClutter topY={height} width={topTier.w} depth={topTier.d} pseudoSeed={pseudoSeed} />
      )}

      {/* Pitched roof for residential buildings */}
      {roofType === 'pitched' && (
        <mesh position={[0, height + 1.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[Math.max(width, depth) * 0.55, 3, 4]} />
          <meshStandardMaterial color={COLORS.RESIDENTIAL_ROOF} roughness={1} />
        </mesh>
      )}
    </group>
  );
});

export default Building;
