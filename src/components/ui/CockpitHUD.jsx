// ============================================================
// CockpitHUD — HTML overlay for driving dashboard
// Speedometer, gear indicator, zone display, speed limit.
// ============================================================

import { useEffect, useState } from 'react';
import useVehicleStore from '../../stores/useVehicleStore.js';
import useGameStore from '../../stores/useGameStore.js';
import { SPEED_LIMITS } from '../../constants/traffic.js';

/**
 * Poll vehicle store at ~15fps for HUD updates.
 * Avoids 60fps React re-renders from Zustand subscriptions.
 */
function useVehicleHUD() {
  const [hud, setHud] = useState({
    speedMph: 0,
    gear: 'P',
    currentZone: 'city',
    score: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const { speedMph, gear, currentZone } = useVehicleStore.getState();
      const { score } = useGameStore.getState();
      setHud({ speedMph, gear, currentZone, score });
    }, 66); // ~15fps
    return () => clearInterval(interval);
  }, []);

  return hud;
}

export default function CockpitHUD({ visible = true }) {
  const { speedMph, gear, currentZone, score } = useVehicleHUD();

  if (!visible) return null;

  const speedLimit = SPEED_LIMITS[currentZone] || 35;
  const isOverSpeed = speedMph > speedLimit + 1;
  const zoneName = currentZone.charAt(0).toUpperCase() + currentZone.slice(1);

  return (
    <div style={styles.container}>
      {/* Speedometer */}
      <div style={styles.speedBlock}>
        <div style={{
          ...styles.speedValue,
          color: isOverSpeed ? '#ff2200' : '#00ff88',
        }}>
          {Math.round(speedMph)}
        </div>
        <div style={styles.speedUnit}>MPH</div>
      </div>

      {/* Gear indicator */}
      <div style={styles.gearBlock}>
        <div style={styles.gearLabel}>GEAR</div>
        <div style={styles.gearValue}>{gear}</div>
      </div>

      {/* Zone + speed limit */}
      <div style={styles.zoneBlock}>
        <div style={styles.zoneLabel}>{zoneName} Zone</div>
        <div style={{
          ...styles.limitValue,
          color: isOverSpeed ? '#ff2200' : '#00ff88',
        }}>
          LIMIT {speedLimit}
        </div>
      </div>

      {/* Score */}
      <div style={styles.scoreBlock}>
        <div style={styles.scoreLabel}>SCORE</div>
        <div style={{
          ...styles.scoreValue,
          color: score < 0 ? '#ff2200' : '#00ff88',
        }}>
          {score}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-end',
    pointerEvents: 'none',
    fontFamily: 'monospace',
    userSelect: 'none',
  },
  speedBlock: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '8px',
    padding: '12px 20px',
    textAlign: 'center',
    minWidth: '100px',
  },
  speedValue: {
    fontSize: '48px',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  speedUnit: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  gearBlock: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '8px',
    padding: '8px 16px',
    textAlign: 'center',
  },
  gearLabel: {
    fontSize: '10px',
    color: '#888',
  },
  gearValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#00ff88',
  },
  zoneBlock: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '8px',
    padding: '8px 16px',
    textAlign: 'center',
  },
  zoneLabel: {
    fontSize: '12px',
    color: '#cccccc',
  },
  limitValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginTop: '2px',
  },
  scoreBlock: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '8px',
    padding: '8px 16px',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: '10px',
    color: '#888',
  },
  scoreValue: {
    fontSize: '28px',
    fontWeight: 'bold',
  },
};
