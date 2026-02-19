// ============================================================
// CameraPanel — HTML overlay: 4 camera views with bounding boxes
// Reads cameraData from sensor store, draws at ~15fps.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import useSensorStore from '../../stores/useSensorStore.js';
import { CAMERA_CV } from '../../constants/sensors.js';
import DraggablePanel from './DraggablePanel.jsx';

/**
 * Draw a single camera view's detections onto a canvas.
 */
function drawView(ctx, w, h, detections, label) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  for (const det of detections) {
    const x = det.x * w;
    const y = det.y * h;
    const bw = det.w * w;
    const bh = det.h * h;

    const cx = Math.max(0, Math.min(w - 2, x));
    const cy = Math.max(0, Math.min(h - 2, y));
    const cw = Math.max(4, Math.min(w - cx, bw));
    const ch = Math.max(4, Math.min(h - cy, bh));

    ctx.strokeStyle = det.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx, cy, cw, ch);

    const conf = Math.round(det.confidence * 100);
    const labelText = conf < 50 ? `${det.label}? ${conf}%` : `${det.label} ${conf}%`;

    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    const textW = ctx.measureText(labelText).width;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cx, cy - 10, textW + 4, 10);
    ctx.fillStyle = det.color;
    ctx.fillText(labelText, cx + 2, cy - 2);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, w / 2, h - 4);
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
      drawView(ctx, canvas.width, canvas.height, detections, view.label);
    }
  }, []);

  useEffect(() => {
    if (!visible || !enabled) return;
    const id = setInterval(draw, 66);
    return () => clearInterval(id);
  }, [visible, enabled, draw]);

  if (!visible || !enabled) return null;

  return (
    <DraggablePanel
      title="CAMERA / CV"
      defaultX={typeof window !== 'undefined' ? window.innerWidth - 580 : 300}
      defaultY={typeof window !== 'undefined' ? window.innerHeight - 310 : 500}
      defaultWidth={560}
      defaultHeight={280}
      minWidth={280}
      minHeight={140}
      color="#ff6600"
      visible={visible}
    >
      {(w, h) => {
        // Divide space: top row = 3 views, bottom row = rear (centered)
        const viewW = Math.floor((w - 6) / 3);
        const viewH = Math.floor((h - 4) / 2);

        // Update canvas sizes
        for (const ref of [leftRef, centerRef, rightRef, rearRef]) {
          if (ref.current) {
            ref.current.width = viewW;
            ref.current.height = viewH;
          }
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', padding: '1px' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              <canvas ref={leftRef} width={viewW} height={viewH} style={{ display: 'block', borderRadius: '2px' }} />
              <canvas ref={centerRef} width={viewW} height={viewH} style={{ display: 'block', borderRadius: '2px' }} />
              <canvas ref={rightRef} width={viewW} height={viewH} style={{ display: 'block', borderRadius: '2px' }} />
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              <canvas ref={rearRef} width={viewW} height={viewH} style={{ display: 'block', borderRadius: '2px' }} />
            </div>
          </div>
        );
      }}
    </DraggablePanel>
  );
}
