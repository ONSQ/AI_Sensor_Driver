// ============================================================
// ThermalPanel — HTML overlay: 2D overhead heatmap canvas
// Reads thermalData from sensor store, draws FLIR-palette blobs.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { THERMAL } from '../../constants/sensors.js';
import { tempToFLIR } from '../../systems/sensors/sensorUtils.js';
import DraggablePanel from './DraggablePanel.jsx';

const MPP = THERMAL.METERS_PER_PIXEL;

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
    const { blobs } = useSensorStore.getState().thermalData;
    const { heading } = useVehicleStore.getState();
    const showTemps = useSensorStore.getState().sensors.thermal.showTemps;

    // Clear to black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Rotate canvas so vehicle heading faces up
    ctx.save();
    ctx.translate(halfW, halfH);
    ctx.rotate(-heading); // negative so forward = up

    // Draw blobs
    for (const blob of blobs) {
      const px = blob.relX / MPP;
      const py = blob.relZ / MPP;
      const r = Math.max(4, blob.radius / MPP);

      const [cr, cg, cb] = tempToFLIR(blob.temp, THERMAL.PALETTE);
      // Boosted alpha so cold objects are still visible
      const alpha = Math.max(0.5, blob.displayTemp / 40);

      // Solid dot at center — ensures every target has a visible marker
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha + 0.2)})`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2, r * 0.3), 0, Math.PI * 2);
      ctx.fill();

      // Radial gradient halo
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

    // Vehicle dot at center (always on top)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(halfW, halfH, 3, 0, Math.PI * 2);
    ctx.fill();

    // Range rings
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    for (const r of THERMAL.RING_INTERVALS) {
      const rPx = r / MPP;
      ctx.beginPath();
      ctx.arc(halfW, halfH, rPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Forward label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('F', halfW, 10);

    // Info label
    ctx.fillStyle = 'rgba(0,200,255,0.5)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${blobs.length} targets`, 4, H - 4);
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
      defaultWidth={200}
      defaultHeight={220}
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
