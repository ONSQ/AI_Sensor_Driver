// ============================================================
// DraggablePanel — reusable draggable/resizable/expandable wrapper
// for sensor monitor panels.
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * @param {object} props
 * @param {string} props.title - Panel title shown in title bar
 * @param {number} props.defaultX - Default left position
 * @param {number} props.defaultY - Default top position
 * @param {number} props.defaultWidth - Default width
 * @param {number} props.defaultHeight - Default height
 * @param {number} [props.minWidth=120] - Minimum width
 * @param {number} [props.minHeight=80] - Minimum height
 * @param {string} [props.color='#00ff88'] - Accent color
 * @param {boolean} [props.visible=true]
 * @param {function} props.children - Render prop: (width, height) => JSX
 */
export default function DraggablePanel({
  title,
  defaultX,
  defaultY,
  defaultWidth,
  defaultHeight,
  minWidth = 120,
  minHeight = 80,
  color = '#00ff88',
  visible = true,
  children,
}) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  // Store pre-expand state so we can restore
  const preExpandRef = useRef({ pos: { x: defaultX, y: defaultY }, size: { w: defaultWidth, h: defaultHeight } });

  // --- Drag logic ---
  const onDragStart = useCallback((e) => {
    if (expanded) return;
    e.preventDefault();
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;

    const onMove = (ev) => {
      const nx = Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - startX));
      const ny = Math.max(0, Math.min(window.innerHeight - 30, ev.clientY - startY));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos, expanded]);

  // --- Resize logic ---
  const onResizeStart = useCallback((e) => {
    if (expanded) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.w;
    const startH = size.h;

    const onMove = (ev) => {
      const nw = Math.max(minWidth, startW + (ev.clientX - startX));
      const nh = Math.max(minHeight, startH + (ev.clientY - startY));
      setSize({ w: nw, h: nh });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size, expanded, minWidth, minHeight]);

  // --- Expand / collapse ---
  const toggleExpand = useCallback(() => {
    if (!expanded) {
      // Save current state, expand to ~70% viewport centered
      preExpandRef.current = { pos: { ...pos }, size: { ...size } };
      const ew = Math.round(window.innerWidth * 0.7);
      const eh = Math.round(window.innerHeight * 0.7);
      setSize({ w: ew, h: eh });
      setPos({
        x: Math.round((window.innerWidth - ew) / 2),
        y: Math.round((window.innerHeight - eh) / 2),
      });
      setExpanded(true);
    } else {
      // Restore
      setPos(preExpandRef.current.pos);
      setSize(preExpandRef.current.size);
      setExpanded(false);
    }
  }, [expanded, pos, size]);

  if (!visible) return null;

  const contentW = size.w;
  const contentH = size.h - 20; // subtract title bar height

  return (
    <div
      ref={dragRef}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: size.w,
        zIndex: expanded ? 100 : 10,
        pointerEvents: 'auto',
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={onDragStart}
        style={{
          height: 20,
          background: 'rgba(0,0,0,0.9)',
          borderTop: `2px solid ${color}`,
          borderLeft: `1px solid ${color}40`,
          borderRight: `1px solid ${color}40`,
          borderRadius: '4px 4px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
          cursor: expanded ? 'default' : 'move',
          userSelect: 'none',
        }}
      >
        <span style={{ color, fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px' }}>
          {title}
        </span>
        <button
          onClick={toggleExpand}
          style={{
            background: 'none',
            border: 'none',
            color: color,
            cursor: 'pointer',
            fontSize: '12px',
            padding: '0 2px',
            lineHeight: 1,
          }}
          title={expanded ? 'Restore' : 'Expand'}
        >
          {expanded ? '⊡' : '⊞'}
        </button>
      </div>

      {/* Content area */}
      <div style={{
        width: contentW,
        height: Math.max(minHeight - 20, contentH),
        background: '#000',
        borderLeft: `1px solid ${color}40`,
        borderRight: `1px solid ${color}40`,
        borderBottom: `1px solid ${color}40`,
        borderRadius: '0 0 4px 4px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {typeof children === 'function'
          ? children(contentW, Math.max(minHeight - 20, contentH))
          : children
        }

        {/* Resize handle (bottom-right corner) */}
        {!expanded && (
          <div
            ref={resizeRef}
            onMouseDown={onResizeStart}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              cursor: 'nwse-resize',
              opacity: 0.4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M10,2 L2,10 M10,6 L6,10 M10,10 L10,10" stroke={color} strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
