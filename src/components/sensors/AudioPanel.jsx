// ============================================================
// AudioPanel — HTML overlay: directional radar + frequency bands
// Reads audioData from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import { AUDIO } from '../../constants/sensors.js';

const SIZE = AUDIO.CANVAS_SIZE;
const HALF = SIZE / 2;
const RADAR_R = HALF - 25; // radar circle radius

export default function AudioPanel({ visible = true }) {
  const canvasRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.audio.enabled);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { sources, noiseFloor } = useSensorStore.getState().audioData;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // --- Directional radar ---
    // Background ring
    ctx.strokeStyle = 'rgba(0,255,136,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(HALF, HALF, RADAR_R, 0, Math.PI * 2);
    ctx.stroke();

    // Inner rings
    ctx.beginPath();
    ctx.arc(HALF, HALF, RADAR_R * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Cross lines
    ctx.beginPath();
    ctx.moveTo(HALF, HALF - RADAR_R);
    ctx.lineTo(HALF, HALF + RADAR_R);
    ctx.moveTo(HALF - RADAR_R, HALF);
    ctx.lineTo(HALF + RADAR_R, HALF);
    ctx.stroke();

    // Vehicle dot at center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(HALF, HALF, 3, 0, Math.PI * 2);
    ctx.fill();

    // Directional label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('F', HALF, HALF - RADAR_R - 4);
    ctx.fillText('B', HALF, HALF + RADAR_R + 10);

    // Sound source wedges
    for (const src of sources) {
      // Bearing: 0 = ahead (+Y on canvas), positive = right
      // Canvas: 0° = up, clockwise
      const angle = src.bearing - Math.PI / 2; // shift so 0 = top

      // Distance along radar radius (closer = more inner)
      const distRatio = Math.min(1, src.distance / AUDIO.RANGE);
      const r = RADAR_R * distRatio;

      // Position on radar
      const px = HALF + Math.cos(angle + Math.PI / 2) * r;
      const py = HALF + Math.sin(angle + Math.PI / 2) * r;

      // Intensity-based size
      const dotSize = 4 + src.intensity * 12;

      // Draw source dot
      ctx.fillStyle = src.color;
      ctx.globalAlpha = Math.min(1, 0.3 + src.intensity);
      ctx.beginPath();
      ctx.arc(px, py, dotSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      ctx.fillStyle = src.color;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(src.label, px, py - dotSize - 2);
    }

    // --- Frequency bands (bottom strip) ---
    const bandY = SIZE - 18;
    const bandW = SIZE - 20;
    const bands = { low: 0, mid: 0, high: 0 };

    for (const src of sources) {
      if (bands[src.freq] !== undefined) {
        bands[src.freq] += src.intensity;
      }
    }

    const maxBand = Math.max(1, bands.low, bands.mid, bands.high);
    const labels = ['LOW', 'MID', 'HIGH'];
    const keys = ['low', 'mid', 'high'];
    const colors = ['#336633', '#ffaa00', '#ff4444'];

    for (let i = 0; i < 3; i++) {
      const x = 10;
      const y = bandY - (2 - i) * 14;
      const w = (bands[keys[i]] / maxBand) * bandW * 0.7;

      // Bar background
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + 28, y - 4, bandW * 0.7, 8);

      // Bar fill
      ctx.fillStyle = colors[i];
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x + 28, y - 4, Math.max(0, w), 8);
      ctx.globalAlpha = 1;

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(labels[i], x, y + 3);
    }

    // Noise floor indicator
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`NOISE: ${(noiseFloor * 100).toFixed(0)}%`, SIZE - 6, SIZE - 4);

    // Panel label
    ctx.fillStyle = 'rgba(0,255,136,0.6)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('AUDIO', 4, 12);
  }, []);

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
    right: 20,
    pointerEvents: 'none',
  },
  canvas: {
    borderRadius: '8px',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    background: '#000',
  },
};
