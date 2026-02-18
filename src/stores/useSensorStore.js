// ============================================================
// Sensor Store — unified state for all 4 sensor systems
// Engines write via update*() actions; panels read via selectors.
// ============================================================

import { create } from 'zustand';
import { LIDAR } from '../constants/sensors.js';

const useSensorStore = create((set) => ({
  // === Global settings ===
  weather: 'clear',       // 'clear' | 'rain' | 'fog'
  timeOfDay: 'daylight',  // 'daylight' | 'dusk' | 'night'

  // === Per-sensor enable + settings ===
  sensors: {
    lidar:   { enabled: true, rayCount: LIDAR.DEFAULT_RAY_COUNT },
    thermal: { enabled: true, showTemps: false },
    audio:   { enabled: true },
    camera:  { enabled: true },
  },

  // === LiDAR output ===
  lidarData: {
    points: [],           // [{x, y, z, distance, color}]
    sweepAngle: 0,
    effectiveRange: LIDAR.MAX_RANGE,
  },

  // === Thermal output ===
  thermalData: {
    blobs: [],            // [{relX, relZ, temp, radius, type}]
  },

  // === Audio output ===
  audioData: {
    sources: [],          // [{bearing, distance, type, intensity, label, color, freq}]
    noiseFloor: 0,
  },

  // === Camera/CV output ===
  cameraData: {
    views: {
      left: [],
      center: [],
      right: [],
      rear: [],
    },
  },

  // === Actions ===
  toggleSensor: (key) => set((s) => ({
    sensors: {
      ...s.sensors,
      [key]: { ...s.sensors[key], enabled: !s.sensors[key].enabled },
    },
  })),

  setLidarRayCount: (count) => set((s) => ({
    sensors: { ...s.sensors, lidar: { ...s.sensors.lidar, rayCount: count } },
  })),

  toggleThermalTemps: () => set((s) => ({
    sensors: {
      ...s.sensors,
      thermal: { ...s.sensors.thermal, showTemps: !s.sensors.thermal.showTemps },
    },
  })),

  setWeather: (weather) => set({ weather }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),

  // Batch updates from engines (called once per sensor tick)
  updateLidar:   (lidarData)   => set({ lidarData }),
  updateThermal: (thermalData) => set({ thermalData }),
  updateAudio:   (audioData)   => set({ audioData }),
  updateCamera:  (cameraData)  => set({ cameraData }),
}));

export default useSensorStore;
