// ============================================================
// SensorStatusBar — small toggleable status icons for each sensor
// ============================================================

import useSensorStore from '../../stores/useSensorStore.js';

const SENSORS = [
  { key: 'lidar',   label: 'LiDAR',   colorOn: '#00ff88', colorOff: '#333' },
  { key: 'thermal', label: 'Thermal',  colorOn: '#00ccff', colorOff: '#333' },
  { key: 'audio',   label: 'Audio',    colorOn: '#00ff88', colorOff: '#333' },
  { key: 'camera',  label: 'Camera',   colorOn: '#ff6600', colorOff: '#333' },
];

export default function SensorStatusBar({ visible = true }) {
  const sensors = useSensorStore((s) => s.sensors);
  const toggleSensor = useSensorStore((s) => s.toggleSensor);

  if (!visible) return null;

  return (
    <div style={styles.container}>
      {SENSORS.map(({ key, label, colorOn, colorOff }) => {
        const isOn = sensors[key]?.enabled;
        return (
          <button
            key={key}
            onClick={() => toggleSensor(key)}
            style={{
              ...styles.button,
              borderColor: isOn ? colorOn : colorOff,
              color: isOn ? colorOn : '#666',
            }}
          >
            <span style={{
              ...styles.dot,
              background: isOn ? colorOn : colorOff,
            }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: 8,
    right: 20,
    display: 'flex',
    gap: '6px',
    fontFamily: 'monospace',
    fontSize: '10px',
    userSelect: 'none',
  },
  button: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.15s',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    display: 'inline-block',
  },
};
