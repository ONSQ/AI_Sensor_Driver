// ============================================================
// LidarPanel — HTML canvas overlay: top-down LiDAR point cloud
// Reads lidarData from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { LIDAR } from '../../constants/sensors.js';
import { hexToRGB } from '../../systems/sensors/sensorUtils.js';
import DraggablePanel from './DraggablePanel.jsx';

const MPP = LIDAR.METERS_PER_PIXEL;

export default function LidarPanel({ visible = true }) {
  const canvasRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.lidar.enabled);
  const sizeRef = useRef({ w: 200, h: 180 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const halfW = W / 2;
    const halfH = H / 2;

    const { points, sweepAngle, effectiveRange } = useSensorStore.getState().lidarData;
    const { position, heading } = useVehicleStore.getState();
    const [vx, , vz] = position;
    const rayCount = useSensorStore.getState().sensors.lidar.rayCount;

    // Clear to black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Range rings
    ctx.strokeStyle = 'rgba(0,255,136,0.12)';
    ctx.lineWidth = 0.5;
    for (const r of [20, 40, 60]) {
      const rPx = r / MPP;
      ctx.beginPath();
      ctx.arc(halfW, halfH, rPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cross lines
    ctx.strokeStyle = 'rgba(0,255,136,0.08)';
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, H);
    ctx.moveTo(0, halfH);
    ctx.lineTo(W, halfH);
    ctx.stroke();

    // Sweep angle line
    ctx.save();
    ctx.translate(halfW, halfH);
    ctx.rotate(-heading); // rotate so forward = up
    const sweepLen = Math.min(halfW, halfH) * 0.9;
    const sweepDx = Math.sin(sweepAngle) * sweepLen;
    const sweepDy = -Math.cos(sweepAngle) * sweepLen;
    ctx.strokeStyle = 'rgba(0,255,136,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sweepDx, sweepDy);
    ctx.stroke();
    ctx.restore();

    // Draw LiDAR points
    for (const p of points) {
      // Relative to vehicle
      const relX = p.x - vx;
      const relZ = p.z - vz;

      // Rotate by -heading so forward = up on canvas
      const cosH = Math.cos(-heading);
      const sinH = Math.sin(-heading);
      const rx = relX * cosH - relZ * sinH;
      const rz = relX * sinH + relZ * cosH;

      // Convert to canvas pixels
      const px = halfW + rx / MPP;
      const py = halfH + rz / MPP;

      // Skip if outside canvas
      if (px < 0 || px > W || py < 0 || py > H) continue;

      const c = hexToRGB(p.color);
      ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vehicle dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(halfW, halfH, 3, 0, Math.PI * 2);
    ctx.fill();

    // Forward indicator
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('F', halfW, 10);

    // Info label
    ctx.fillStyle = 'rgba(0,255,136,0.5)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${rayCount} rays  ${Math.round(effectiveRange)}m`, 4, H - 4);
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
      defaultWidth={200}
      defaultHeight={220}
      color="#00ff88"
      visible={visible}
    >
      {(w, h) => {
        // Update canvas size when panel resizes
        if (canvasRef.current && (canvasRef.current.width !== w || canvasRef.current.height !== h)) {
          canvasRef.current.width = w;
          canvasRef.current.height = h;
        }
        sizeRef.current = { w, h };
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
