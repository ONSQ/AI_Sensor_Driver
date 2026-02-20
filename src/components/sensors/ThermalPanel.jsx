// ============================================================
// ThermalPanel — HTML overlay: forward-facing FLIR thermal camera
// Projects thermal blobs into perspective view with FLIR palette.
// Reads thermalData from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { THERMAL } from '../../constants/sensors.js';
import { tempToFLIR } from '../../systems/sensors/sensorUtils.js';
import DraggablePanel from './DraggablePanel.jsx';

const EYE_Y = 1.5;
const FOV_DEG = THERMAL.FRONT_VIEW_FOV || 75;
const FOV_RAD = (FOV_DEG * Math.PI) / 180;
const TAN_HALF_FOV = Math.tan(FOV_RAD / 2);

export default function ThermalPanel({ visible = true }) {
  const canvasRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.thermal.enabled);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const halfW = W / 2;
    const halfH = H / 2;
    const aspect = W / H;

    const { blobs } = useSensorStore.getState().thermalData;
    const { heading } = useVehicleStore.getState();
    const showTemps = useSensorStore.getState().sensors.thermal.showTemps;

    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    // Fill with FLIR cold color (dark blue-purple background)
    ctx.fillStyle = 'rgb(15, 10, 50)';
    ctx.fillRect(0, 0, W, H);

    // Subtle vignette effect for authentic thermal camera look
    const vignette = ctx.createRadialGradient(halfW, halfH, 0, halfW, halfH, Math.max(halfW, halfH));
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.85, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // --- Crosshair ---
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, H);
    ctx.moveTo(0, halfH);
    ctx.lineTo(W, halfH);
    ctx.stroke();

    // --- Project and draw each thermal blob ---
    let targetCount = 0;

    // Sort blobs by distance (far first so near draws on top)
    const sortedBlobs = [...blobs].sort((a, b) => {
      const dA = a.relX * a.relX + a.relZ * a.relZ;
      const dB = b.relX * b.relX + b.relZ * b.relZ;
      return dB - dA;
    });

    for (const blob of sortedBlobs) {
      // relX/relZ are vehicle-relative
      const { relX, relZ, temp, displayTemp, boundsH, boundsHW, type, worldY } = blob;

      // Rotate into camera-local space
      const localX = relX * cosH - relZ * sinH;
      const localZ = -relX * sinH - relZ * cosH;

      // Skip behind camera
      if (localZ <= 1.0) continue;

      // Vertical: use world Y center of object
      const objCenterY = (worldY || 0) + (boundsH || 2) / 2;
      const localY = objCenterY - EYE_Y;

      // Perspective projection
      const ndcX = localX / (localZ * TAN_HALF_FOV * aspect);
      const ndcY = localY / (localZ * TAN_HALF_FOV);

      const px = halfW + ndcX * halfW;
      const py = halfH - ndcY * halfH;

      // Skip if center is way off screen
      if (px < -100 || px > W + 100 || py < -100 || py > H + 100) continue;

      // Projected size
      const hw = boundsHW || 1;
      const bh = boundsH || 2;
      const projW = Math.max(4, (hw * 2) / (localZ * TAN_HALF_FOV * aspect * 2) * W);
      const projH = Math.max(4, bh / (localZ * TAN_HALF_FOV * 2) * H);

      // FLIR color
      const [cr, cg, cb] = tempToFLIR(temp, THERMAL.PALETTE);
      const alpha = Math.max(0.5, displayTemp / 35);

      // Glow effect (radial gradient halo)
      const glowR = Math.max(projW, projH) * 1.2;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(1, alpha * 0.6)})`);
      grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${Math.min(1, alpha * 0.25)})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);

      // Solid filled shape (rectangle for buildings, circle for others)
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha)})`;
      if (type === 'building') {
        ctx.fillRect(px - projW / 2, py - projH / 2, projW, projH);
      } else {
        ctx.beginPath();
        ctx.ellipse(px, py, projW / 2, projH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Temperature label
      if (showTemps && type !== 'building') {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(temp)}°`, px, py - projH / 2 - 4);
      }

      targetCount++;
    }

    // --- Info label ---
    ctx.fillStyle = 'rgba(0,200,255,0.5)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${targetCount} targets`, 4, H - 4);

    // --- "THERMAL CAM" label ---
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('THERMAL CAM', W - 4, H - 4);
  }, []);

  // Poll at ~15fps
  useEffect(() => {
    if (!visible || !enabled) return;
    const id = setInterval(draw, 66);
    return () => clearInterval(id);
  }, [visible, enabled, draw]);

  if (!visible || !enabled) return null;

  return (
    <DraggablePanel
      title="THERMAL IR"
      defaultX={20}
      defaultY={310}
      defaultWidth={280}
      defaultHeight={200}
      minWidth={160}
      minHeight={100}
      color="#00ccff"
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
