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

  // Resize canvas to match viewport
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Clear (transparent)
    ctx.clearRect(0, 0, W, H);

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

      // Bounding box
      ctx.strokeStyle = det.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);

      // Corner accents (small L-shapes at corners for a HUD feel)
      const cornerLen = Math.min(10, cw / 3, ch / 3);
      ctx.lineWidth = 2.5;
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
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(cx, cy - 18, textW + 8, 18);

      // Label text
      ctx.fillStyle = det.color;
      ctx.fillText(labelText, cx + 4, cy - 5);
    }

    // Detection count badge (top-right)
    if (detections.length > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(W - 100, 8, 92, 18);
      ctx.fillStyle = 'rgba(255,102,0,0.7)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`CV: ${detections.length} objects`, W - 12, 21);
    }
  }, []);

  useEffect(() => {
    if (!visible || !enabled) return;
    const id = setInterval(draw, 66); // ~15fps
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
