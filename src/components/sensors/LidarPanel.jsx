// ============================================================
// LidarPanel — HTML canvas overlay: forward-facing LiDAR point cloud
// Perspective projection — like looking through the windshield.
// Reads lidarData from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { LIDAR } from '../../constants/sensors.js';
import { hexToRGB } from '../../systems/sensors/sensorUtils.js';
import DraggablePanel from './DraggablePanel.jsx';

const EYE_Y = 1.5;
const FOV_DEG = LIDAR.FRONT_VIEW_FOV || 75;
const FOV_RAD = (FOV_DEG * Math.PI) / 180;
const TAN_HALF_FOV = Math.tan(FOV_RAD / 2);

export default function LidarPanel({ visible = true }) {
  const canvasRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.lidar.enabled);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const halfW = W / 2;
    const halfH = H / 2;
    const aspect = W / H;

    const { points, sweepAngle, effectiveRange } = useSensorStore.getState().lidarData;
    const { position, heading } = useVehicleStore.getState();
    const [vx, , vz] = position;
    const rayCount = useSensorStore.getState().sensors.lidar.rayCount;

    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    // Clear to black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // --- Horizon line ---
    // Project ground plane (Y=0) at eye height
    // localY = 0 - EYE_Y = -EYE_Y → projects to positive screen Y (below center)
    // At infinite distance, ndcY = 0, so horizon is at halfH
    ctx.strokeStyle = 'rgba(0,255,136,0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(W, halfH);
    ctx.stroke();

    // --- Depth grid lines (project horizontal lines at ground level) ---
    const gridDistances = [10, 20, 40, 60];
    ctx.strokeStyle = 'rgba(0,255,136,0.08)';
    ctx.lineWidth = 0.5;
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,255,136,0.2)';

    for (const d of gridDistances) {
      // Ground plane at distance d: localZ=d, localY=-EYE_Y
      const ndcY = -EYE_Y / (d * TAN_HALF_FOV);
      const screenY = halfH - ndcY * halfH;
      if (screenY < 0 || screenY > H) continue;

      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(W, screenY);
      ctx.stroke();

      ctx.fillText(`${d}m`, W - 4, screenY - 2);
    }

    // --- Crosshair ---
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, H);
    ctx.stroke();

    // --- Draw LiDAR points ---
    let visibleCount = 0;
    for (const p of points) {
      // Vehicle-relative position
      const relX = p.x - vx;
      const relZ = p.z - vz;
      const relY = p.y - EYE_Y;

      // Rotate into camera-local space
      // Forward = positive localZ (into the screen)
      const localX = relX * cosH - relZ * sinH;
      const localZ = -relX * sinH - relZ * cosH;

      // Skip points behind camera
      if (localZ <= 0.5) continue;

      // Perspective projection
      const ndcX = localX / (localZ * TAN_HALF_FOV * aspect);
      const ndcY = relY / (localZ * TAN_HALF_FOV);

      // NDC to canvas pixels
      const px = halfW + ndcX * halfW;
      const py = halfH - ndcY * halfH;

      // Skip if outside canvas
      if (px < -2 || px > W + 2 || py < -2 || py > H + 2) continue;

      // Point size: closer = larger
      const ptSize = Math.max(1.5, Math.min(6, 2 + 3 / localZ));

      const c = hexToRGB(p.color);
      ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
      ctx.beginPath();
      ctx.arc(px, py, ptSize, 0, Math.PI * 2);
      ctx.fill();
      visibleCount++;
    }

    // --- Sweep indicator (small arc at top) ---
    const sweepNorm = (sweepAngle % (Math.PI * 2)) / (Math.PI * 2);
    ctx.fillStyle = 'rgba(0,255,136,0.3)';
    ctx.fillRect(0, 0, W * sweepNorm, 2);

    // --- Info label ---
    ctx.fillStyle = 'rgba(0,255,136,0.5)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${rayCount} rays  ${Math.round(effectiveRange)}m  ${visibleCount} pts`, 4, H - 4);

    // --- "FRONT VIEW" label ---
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('FRONT VIEW', W - 4, H - 4);
  }, []);

  useEffect(() => {
    if (!visible || !enabled) return;
    const id = setInterval(draw, 66);
    return () => clearInterval(id);
  }, [visible, enabled, draw]);

  if (!visible || !enabled) return null;

  return (
    <DraggablePanel
      title="LiDAR"
      defaultX={20}
      defaultY={80}
      defaultWidth={280}
      defaultHeight={200}
      minWidth={160}
      minHeight={100}
      color="#00ff88"
      visible={visible}
    >
      {(w, h) => {
        if (canvasRef.current && (canvasRef.current.width !== w || canvasRef.current.height !== h)) {
          canvasRef.current.width = w;
          canvasRef.current.height = h;
        }
        return (
          <canvas
            ref={canvasRef}
            width={w}
            height={h}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        );
      }}
    </DraggablePanel>
  );
}
