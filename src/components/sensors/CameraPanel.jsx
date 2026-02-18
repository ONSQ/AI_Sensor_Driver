// ============================================================
// CameraPanel — HTML overlay: 4 camera views with bounding boxes
// Reads cameraData from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import { CAMERA_CV } from '../../constants/sensors.js';

const W = CAMERA_CV.CANVAS_WIDTH;
const H = CAMERA_CV.CANVAS_HEIGHT;

/**
 * Draw a single camera view's detections onto a canvas.
 */
function drawView(ctx, detections, label) {
  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Draw each detection
  for (const det of detections) {
    const x = det.x * W;
    const y = det.y * H;
    const w = det.w * W;
    const h = det.h * H;

    // Clamp within canvas
    const cx = Math.max(0, Math.min(W - 2, x));
    const cy = Math.max(0, Math.min(H - 2, y));
    const cw = Math.max(4, Math.min(W - cx, w));
    const ch = Math.max(4, Math.min(H - cy, h));

    // Bounding box
    ctx.strokeStyle = det.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx, cy, cw, ch);

    // Label with confidence
    const conf = Math.round(det.confidence * 100);
    const labelText = conf < 50
      ? `${det.label}? ${conf}%`
      : `${det.label} ${conf}%`;

    ctx.fillStyle = det.color;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';

    // Background for label
    const textW = ctx.measureText(labelText).width;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cx, cy - 10, textW + 4, 10);
    ctx.fillStyle = det.color;
    ctx.fillText(labelText, cx + 2, cy - 2);
  }

  // View label
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, W / 2, H - 4);
}

export default function CameraPanel({ visible = true }) {
  const leftRef = useRef(null);
  const centerRef = useRef(null);
  const rightRef = useRef(null);
  const rearRef = useRef(null);
  const enabled = useSensorStore((s) => s.sensors.camera.enabled);

  const draw = useCallback(() => {
    const { views } = useSensorStore.getState().cameraData;
    const refs = {
      left: leftRef.current,
      center: centerRef.current,
      right: rightRef.current,
      rear: rearRef.current,
    };

    for (const view of CAMERA_CV.VIEWS) {
      const canvas = refs[view.id];
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');
      const detections = views[view.id] || [];
      drawView(ctx, detections, view.label);
    }
  }, []);

  useEffect(() => {
    if (!visible || !enabled) return;
    const id = setInterval(draw, 66);
    return () => clearInterval(id);
  }, [visible, enabled, draw]);

  if (!visible || !enabled) return null;

  return (
    <div style={styles.container}>
      {/* Top row: left | center | right */}
      <div style={styles.row}>
        <canvas ref={leftRef} width={W} height={H} style={styles.canvas} />
        <canvas ref={centerRef} width={W} height={H} style={styles.canvas} />
        <canvas ref={rightRef} width={W} height={H} style={styles.canvas} />
      </div>
      {/* Bottom: rear (centered) */}
      <div style={styles.row}>
        <canvas ref={rearRef} width={W} height={H} style={styles.canvas} />
      </div>
      {/* Panel label */}
      <div style={styles.label}>CAMERA / CV</div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'center',
  },
  row: {
    display: 'flex',
    gap: '2px',
  },
  canvas: {
    borderRadius: '4px',
    border: '1px solid rgba(255, 100, 0, 0.3)',
    background: '#000',
  },
  label: {
    color: 'rgba(255, 100, 0, 0.6)',
    fontFamily: 'monospace',
    fontSize: '9px',
    fontWeight: 'bold',
    marginTop: '2px',
  },
};
