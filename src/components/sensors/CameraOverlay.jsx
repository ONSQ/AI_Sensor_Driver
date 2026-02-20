// ============================================================
// CameraOverlay — fullscreen transparent canvas overlay
// Draws CV bounding boxes + labels directly on the 3D viewport.
// Reads cameraData.views.main from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';

export default function CameraOverlay({ visible = true }) {
  const canvasRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.camera.enabled);

  // Resize canvas to match viewport (DPR-aware for crisp rendering)
  useEffect(() => {
    if (!visible || !enabled) return;
    const resize = () => {
      if (canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = window.innerWidth * dpr;
        canvasRef.current.height = window.innerHeight * dpr;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [visible, enabled]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Clear at native resolution (identity transform), then apply DPR scale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const detections = useSensorStore.getState().cameraData.views.main || [];

    for (const det of detections) {
      // Map normalized [0,1] coords to full viewport pixels
      const x = det.x * W;
      const y = det.y * H;
      const bw = det.w * W;
      const bh = det.h * H;

      // Clamp to viewport
      const cx = Math.max(0, Math.min(W - 2, x));
      const cy = Math.max(0, Math.min(H - 2, y));
      const cw = Math.max(4, Math.min(W - cx, bw));
      const ch = Math.max(4, Math.min(H - cy, bh));

      // Bounding box (semi-transparent)
      const r = parseInt(det.color.slice(1, 3), 16);
      const g = parseInt(det.color.slice(3, 5), 16);
      const b = parseInt(det.color.slice(5, 7), 16);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx, cy, cw, ch);

      // Corner accents (small L-shapes at corners for a HUD feel)
      const cornerLen = Math.min(10, cw / 3, ch / 3);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
      ctx.lineWidth = 1.5;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(cx, cy + cornerLen);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + cornerLen, cy);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(cx + cw - cornerLen, cy);
      ctx.lineTo(cx + cw, cy);
      ctx.lineTo(cx + cw, cy + cornerLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(cx, cy + ch - cornerLen);
      ctx.lineTo(cx, cy + ch);
      ctx.lineTo(cx + cornerLen, cy + ch);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(cx + cw - cornerLen, cy + ch);
      ctx.lineTo(cx + cw, cy + ch);
      ctx.lineTo(cx + cw, cy + ch - cornerLen);
      ctx.stroke();

      // Label: class name + confidence + distance
      const conf = Math.round(det.confidence * 100);
      const dist = Math.round(det.distance);
      const labelText = conf < 50
        ? `${det.label}? ${conf}%  ${dist}m`
        : `${det.label} ${conf}%  ${dist}m`;

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      const textW = ctx.measureText(labelText).width;

      // Label background
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(cx, cy - 18, textW + 8, 18);

      // Label text
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.fillText(labelText, cx + 4, cy - 5);
    }

    // Detection count badge (top-right)
    if (detections.length > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(W - 100, 8, 92, 18);
      ctx.fillStyle = 'rgba(255,102,0,0.8)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`CV: ${detections.length} objects`, W - 12, 21);
    }
  }, []);

  useEffect(() => {
    if (!visible || !enabled) return;
    const id = setInterval(draw, 33); // ~30fps
    return () => clearInterval(id);
  }, [visible, enabled, draw]);

  if (!visible || !enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
