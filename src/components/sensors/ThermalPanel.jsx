// ============================================================
// ThermalPanel — HTML overlay: 2D overhead heatmap canvas
// Reads thermalData from sensor store, draws FLIR-palette blobs.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { THERMAL } from '../../constants/sensors.js';
import { tempToFLIR } from '../../systems/sensors/sensorUtils.js';

const SIZE = THERMAL.CANVAS_SIZE;
const HALF = SIZE / 2;
const MPP = THERMAL.METERS_PER_PIXEL;

export default function ThermalPanel({ visible = true }) {
  const canvasRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.thermal.enabled);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { blobs } = useSensorStore.getState().thermalData;
    const { heading } = useVehicleStore.getState();
    const showTemps = useSensorStore.getState().sensors.thermal.showTemps;

    // Clear to black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Rotate canvas so vehicle heading faces up
    ctx.save();
    ctx.translate(HALF, HALF);
    ctx.rotate(heading);

    // Draw blobs
    for (const blob of blobs) {
      const px = blob.relX / MPP;
      const py = blob.relZ / MPP;
      const r = Math.max(3, blob.radius / MPP);

      const [cr, cg, cb] = tempToFLIR(blob.temp, THERMAL.PALETTE);
      const alpha = Math.max(0.2, blob.displayTemp / 50);

      // Radial gradient blob
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(1, alpha)})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);

      // Optional temperature labels
      if (showTemps && blob.type !== 'building') {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(blob.temp)}°`, px, py - r - 2);
      }
    }

    ctx.restore();

    // Draw vehicle dot at center (always on top)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(HALF, HALF, 3, 0, Math.PI * 2);
    ctx.fill();

    // Range rings
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    for (const r of THERMAL.RING_INTERVALS) {
      const rPx = r / MPP;
      ctx.beginPath();
      ctx.arc(HALF, HALF, rPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Compass labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', HALF, 10);
    ctx.fillText('S', HALF, SIZE - 4);
    ctx.textAlign = 'left';
    ctx.fillText('W', 4, HALF + 3);
    ctx.textAlign = 'right';
    ctx.fillText('E', SIZE - 4, HALF + 3);

    // Label
    ctx.fillStyle = 'rgba(0,200,255,0.6)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('THERMAL IR', 4, SIZE - 4);
  }, []);

  // Poll at ~15fps
  useEffect(() => {
    if (!visible || !enabled) return;
    const id = setInterval(draw, 66);
    return () => clearInterval(id);
  }, [visible, enabled, draw]);

  if (!visible || !enabled) return null;

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={styles.canvas}
      />
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 80,
    left: 20,
    pointerEvents: 'none',
  },
  canvas: {
    borderRadius: '8px',
    border: '1px solid rgba(0, 200, 255, 0.3)',
    background: '#000',
  },
};
