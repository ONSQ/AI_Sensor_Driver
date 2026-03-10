// ============================================================
// LidarPanel — HTML canvas overlay: top-down (bird's-eye) LiDAR point cloud
// Vehicle at center, forward = up. Reads lidarData from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { LIDAR } from '../../constants/sensors.js';
import { hexToRGB } from '../../systems/sensors/sensorUtils.js';
import DraggablePanel from './DraggablePanel.jsx';

// Zoomed-in view: show half the range so nearby detail is larger (2x zoom)
const VIEW_ZOOM = 2;

export default function LidarPanel({ visible = true }) {
  const canvasRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.lidar.enabled);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const { points, effectiveRange } = useSensorStore.getState().lidarData;
    const { position, heading } = useVehicleStore.getState();
    const [vx, , vz] = position;
    const rayCount = useSensorStore.getState().sensors.lidar.rayCount;

    // Scale: zoomed-in view — show effectiveRange/VIEW_ZOOM so nearby detail is larger
    const radiusPx = Math.min(W, H) / 2 - 4;
    const visibleRange = effectiveRange / VIEW_ZOOM;
    const scale = radiusPx / Math.max(1, visibleRange);

    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    // Clear to black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // --- Draw LiDAR points (vehicle-relative, rotated so forward = up) ---
    let visibleCount = 0;
    for (const p of points) {
      const relX = p.x - vx;
      const relZ = p.z - vz;
      // Vehicle forward in world (physics) = (-sin(h), -cos(h)) in XZ, so ahead = negative relZ when h=0.
      // Rotate to vehicle-local: localX = right, localZ = forward (positive ahead).
      const localX = relX * cosH - relZ * sinH;
      const localZ = relX * sinH + relZ * cosH;
      // Screen: forward = up (smaller py), so py = cy + localZ*scale (ahead = neg localZ -> smaller py)
      const px = cx + localX * scale;
      const py = cy + localZ * scale;

      if (px < -2 || px > W + 2 || py < -2 || py > H + 2) continue;
      const dist = Math.sqrt(localX * localX + localZ * localZ);
      if (dist > visibleRange) continue;

      const ptSize = Math.max(1, Math.min(4, 2 + 8 / (dist + 1)));
      const c = hexToRGB(p.color);
      ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
      ctx.beginPath();
      ctx.arc(px, py, ptSize, 0, Math.PI * 2);
      ctx.fill();
      visibleCount++;
    }

    // --- Vehicle triangle (forward = up) ---
    const triSize = 8;
    ctx.fillStyle = 'rgba(0,255,136,0.9)';
    ctx.strokeStyle = 'rgba(0,255,136,1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - triSize);
    ctx.lineTo(cx - triSize * 0.6, cy + triSize * 0.7);
    ctx.lineTo(cx + triSize * 0.6, cy + triSize * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- Info label ---
    ctx.fillStyle = 'rgba(0,255,136,0.5)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${rayCount}r  ${Math.round(visibleRange)}m  ${visibleCount} pts`, 4, H - 4);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'right';
    ctx.fillText('TOP VIEW', W - 4, H - 4);
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
