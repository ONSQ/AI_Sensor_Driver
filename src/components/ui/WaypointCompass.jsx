// ============================================================
// WaypointCompass — HUD overlay showing direction + distance
// to current waypoint, plus progress counter.
// ============================================================

import { useEffect, useState } from 'react';
import useVehicleStore from '../../stores/useVehicleStore.js';
import useGameStore from '../../stores/useGameStore.js';

/**
 * Poll vehicle + game store at ~15fps for compass updates.
 */
function useCompassData() {
  const [data, setData] = useState({
    angle: 0,
    distance: 0,
    current: 0,
    total: 0,
    allDone: false,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const { position, heading } = useVehicleStore.getState();
      const { waypoints, currentWaypointIndex } = useGameStore.getState();

      if (!waypoints.length) return;

      const total = waypoints.length;
      const allDone = currentWaypointIndex >= total;

      if (allDone) {
        setData({ angle: 0, distance: 0, current: total, total, allDone: true });
        return;
      }

      const wp = waypoints[currentWaypointIndex];
      const [vx, , vz] = position;
      const [wx, , wz] = wp.position;

      // Direction from vehicle to waypoint
      // Three.js: -Z is north, heading=0 faces +Z (south)
      const dx = wx - vx;
      const dz = wz - vz;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Angle to waypoint in world space (atan2 gives angle from +Z axis)
      const angleToWP = Math.atan2(dx, dz);
      // Relative angle: subtract vehicle heading
      const relativeAngle = angleToWP - heading;

      setData({
        angle: relativeAngle,
        distance: Math.round(distance),
        current: currentWaypointIndex + 1,
        total,
        allDone: false,
      });
    }, 66); // ~15fps

    return () => clearInterval(interval);
  }, []);

  return data;
}

export default function WaypointCompass({ visible = true }) {
  const { angle, distance, current, total, allDone } = useCompassData();

  if (!visible || total === 0) return null;

  // Arrow rotation in CSS (0° = up)
  const arrowDeg = (angle * 180) / Math.PI;

  return (
    <div style={styles.container}>
      {allDone ? (
        <div style={styles.completeBlock}>
          <div style={styles.completeText}>ROUTE COMPLETE</div>
          <div style={styles.counter}>{total} / {total}</div>
        </div>
      ) : (
        <>
          {/* Direction arrow */}
          <div style={styles.arrowBlock}>
            <div style={{
              ...styles.arrow,
              transform: `rotate(${arrowDeg}deg)`,
            }}>
              &#9650;
            </div>
          </div>

          {/* Distance */}
          <div style={styles.distBlock}>
            <div style={styles.distValue}>{distance}m</div>
          </div>

          {/* Waypoint counter */}
          <div style={styles.counterBlock}>
            <div style={styles.counterLabel}>WAYPOINT</div>
            <div style={styles.counter}>{current} / {total}</div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    pointerEvents: 'none',
    fontFamily: 'monospace',
    userSelect: 'none',
  },
  arrowBlock: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: '24px',
    color: '#00ff88',
    lineHeight: 1,
    transition: 'transform 0.15s ease-out',
  },
  distBlock: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '8px',
    padding: '6px 12px',
    textAlign: 'center',
  },
  distValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#00ff88',
  },
  counterBlock: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '8px',
    padding: '6px 12px',
    textAlign: 'center',
  },
  counterLabel: {
    fontSize: '9px',
    color: '#888',
    letterSpacing: '1px',
  },
  counter: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#00ff88',
  },
  completeBlock: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(0, 255, 136, 0.5)',
    borderRadius: '8px',
    padding: '8px 20px',
    textAlign: 'center',
  },
  completeText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#00ff88',
    letterSpacing: '2px',
  },
};
