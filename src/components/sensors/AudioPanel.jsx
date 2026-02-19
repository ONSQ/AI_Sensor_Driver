// ============================================================
// AudioPanel — HTML overlay: directional radar + frequency bands
// Reads audioData from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import { AUDIO } from '../../constants/sensors.js';
import DraggablePanel from './DraggablePanel.jsx';

export default function AudioPanel({ visible = true }) {
  const canvasRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.audio.enabled);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const halfW = W / 2;
    const halfH = H / 2;
    const radarR = Math.min(halfW, halfH) - 25;
    const { sources, noiseFloor } = useSensorStore.getState().audioData;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Background ring
    ctx.strokeStyle = 'rgba(0,255,136,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(halfW, halfH, radarR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(halfW, halfH, radarR * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Cross lines
    ctx.beginPath();
    ctx.moveTo(halfW, halfH - radarR);
    ctx.lineTo(halfW, halfH + radarR);
    ctx.moveTo(halfW - radarR, halfH);
    ctx.lineTo(halfW + radarR, halfH);
    ctx.stroke();

    // Vehicle dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(halfW, halfH, 3, 0, Math.PI * 2);
    ctx.fill();

    // Directional labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('F', halfW, halfH - radarR - 4);
    ctx.fillText('B', halfW, halfH + radarR + 10);

    // Sound sources — FIXED bearing math
    // bearing: 0 = ahead, +π/2 = right, -π/2 = left
    // Canvas: up = -Y, right = +X
    for (const src of sources) {
      const distRatio = Math.min(1, src.distance / AUDIO.RANGE);
      const r = radarR * distRatio;

      // bearing=0 → up (sin=0, -cos=-1 → top)
      const px = halfW + Math.sin(src.bearing) * r;
      const py = halfH - Math.cos(src.bearing) * r;

      const dotSize = 4 + src.intensity * 12;

      // Source dot
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

    // Frequency bands (bottom strip)
    const bands = { low: 0, mid: 0, high: 0 };
    for (const src of sources) {
      if (bands[src.freq] !== undefined) bands[src.freq] += src.intensity;
    }

    const maxBand = Math.max(1, bands.low, bands.mid, bands.high);
    const labels = ['LOW', 'MID', 'HIGH'];
    const keys = ['low', 'mid', 'high'];
    const colors = ['#336633', '#ffaa00', '#ff4444'];
    const bandW = W - 20;

    for (let i = 0; i < 3; i++) {
      const x = 10;
      const y = H - 18 - (2 - i) * 14;
      const w = (bands[keys[i]] / maxBand) * bandW * 0.7;

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + 28, y - 4, bandW * 0.7, 8);

      ctx.fillStyle = colors[i];
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x + 28, y - 4, Math.max(0, w), 8);
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(labels[i], x, y + 3);
    }

    // Noise floor
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`NOISE: ${(noiseFloor * 100).toFixed(0)}%`, W - 6, H - 4);
  }, []);

  useEffect(() => {
    if (!visible || !enabled) return;
    const id = setInterval(draw, 66);
    return () => clearInterval(id);
  }, [visible, enabled, draw]);

  if (!visible || !enabled) return null;

  return (
    <DraggablePanel
      title="AUDIO"
      defaultX={typeof window !== 'undefined' ? window.innerWidth - 220 : 600}
      defaultY={80}
      defaultWidth={200}
      defaultHeight={220}
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
