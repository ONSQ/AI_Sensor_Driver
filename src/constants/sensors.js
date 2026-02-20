// ============================================================
// Sensor Constants — SensorRacer v2
// All tuning parameters for LiDAR, Thermal IR, Audio, Camera/CV.
// ============================================================

// === LiDAR ===
export const LIDAR = {
  RAY_COUNTS: [24, 48, 72],
  DEFAULT_RAY_COUNT: 48,
  MAX_RANGE: 80,                       // meters
  VERTICAL_LAYERS: 3,
  VERTICAL_ANGLES: [-5, 0, 5],        // degrees from horizontal
  SWEEP_SPEED: 2.0,                    // full rotations per second
  FRAME_SKIP: 2,                       // cast every 2nd frame → ~30fps
  STAGGER_OFFSET: 0,

  // Weather degradation
  FOG_RANGE_FACTOR: 0.4,
  RAIN_NOISE_METERS: 1.5,

  // Front-view projection
  FRONT_VIEW_FOV: 75,                   // degrees — matches first-person camera

  // Visualization
  POINT_SIZE: 0.25,
  COLOR_CLOSE: '#ff2200',
  COLOR_MID: '#ffcc00',
  COLOR_FAR: '#00ff88',
  CLOSE_THRESHOLD: 10,                // meters
  FAR_THRESHOLD: 40,
};

// === THERMAL IR ===
export const THERMAL = {
  RANGE: 60,                            // meters
  FRONT_VIEW_FOV: 75,                   // degrees — matches first-person camera
  FRAME_SKIP: 4,                        // ~15fps
  STAGGER_OFFSET: 1,

  // FLIR palette breakpoints (temp → [r, g, b])
  PALETTE: [
    { temp: 0,   color: [15, 10, 50] },        // dark blue-purple (cold)
    { temp: 10,  color: [40, 0, 80] },         // deep purple
    { temp: 20,  color: [120, 0, 160] },       // purple
    { temp: 30,  color: [200, 40, 0] },        // red
    { temp: 38,  color: [255, 200, 0] },       // yellow
    { temp: 50,  color: [255, 255, 220] },     // white (hot)
  ],

  // Thermal signatures (degrees C)
  SIGNATURES: {
    building: 12,
    cone: 18,
    barrier: 18,
    pole: 15,
    school_sign: 16,
    hospital_cross: 16,
    speed_sign: 16,
    traffic_light: 35,     // electronics generate heat
    stop_sign: 16,
    // Dynamic entity signatures
    pedestrian: 36,
    vehicle_moving: 45,
    vehicle_parked: 20,
    emergency: 50,
    animal: 37,
    ball: 18,
  },

  INTENSITY_FALLOFF: 0.012,            // per meter
  FOG_DEGRADATION: 0.7,
  RAIN_DEGRADATION: 0.85,

  // Range rings
  RING_INTERVALS: [20, 40, 60],
};

// === AUDIO ===
export const AUDIO = {
  RANGE: 100,                           // meters max audible
  FRAME_SKIP: 3,                        // ~20fps
  STAGGER_OFFSET: 2,
  CANVAS_SIZE: 180,                     // pixels (square)
  NUM_BEARING_SECTORS: 36,              // 10° sectors

  // Sound types with metadata
  SOUND_TYPES: {
    construction: { freq: 'low',  priority: 3,  label: 'CONSTRUCT', color: '#ff8800', baseIntensity: 0.8 },
    engine:       { freq: 'low',  priority: 4,  label: 'ENGINE',    color: '#888888', baseIntensity: 0.6 },
    ambient:      { freq: 'low',  priority: 1,  label: 'AMBIENT',   color: '#336633', baseIntensity: 0.3 },
    signal:       { freq: 'mid',  priority: 5,  label: 'SIGNAL',    color: '#ffaa00', baseIntensity: 0.5 },
    // Dynamic entity sound types
    footsteps:    { freq: 'high', priority: 2,  label: 'FOOTSTEP',  color: '#88ccff', baseIntensity: 0.15 },
    siren:        { freq: 'high', priority: 6,  label: 'SIREN',     color: '#ff0044', baseIntensity: 0.95 },
    barking:      { freq: 'mid',  priority: 3,  label: 'BARK',      color: '#bb8844', baseIntensity: 0.3 },
    bouncing:     { freq: 'high', priority: 2,  label: 'BOUNCE',    color: '#44cc44', baseIntensity: 0.2 },
  },

  RAIN_NOISE_FLOOR: 0.25,
  BASE_NOISE_FLOOR: 0.05,
  DISTANCE_FALLOFF: 0.04,               // intensity = 1 / (1 + dist * falloff)
};

// === CAMERA / CV ===
export const CAMERA_CV = {
  VIEWS: [
    { id: 'left',   fovDeg: 60,  headingOffset: Math.PI / 3,    label: 'LEFT' },
    { id: 'center', fovDeg: 90,  headingOffset: 0,              label: 'CENTER' },
    { id: 'right',  fovDeg: 60,  headingOffset: -Math.PI / 3,   label: 'RIGHT' },
    { id: 'rear',   fovDeg: 40,  headingOffset: Math.PI,        label: 'REAR' },
  ],
  MAX_RANGE: 60,                        // meters
  FRAME_SKIP: 3,                        // ~20fps
  STAGGER_OFFSET: 1,
  CANVAS_WIDTH: 180,                    // per-view canvas
  CANVAS_HEIGHT: 110,

  // Object classes with visual properties
  CLASSES: {
    building:      { color: '#6666aa', label: 'BUILDING' },
    cone:          { color: '#ff6600', label: 'CONE' },
    barrier:       { color: '#ff4400', label: 'BARRIER' },
    sign:          { color: '#ffff00', label: 'SIGN' },
    traffic_light: { color: '#ff0000', label: 'T-LIGHT' },
    stop_sign:     { color: '#cc0000', label: 'STOP-SIGN' },
    hospital_cross:{ color: '#ff3333', label: 'HOSPITAL' },
    // Dynamic entity classes
    pedestrian:    { color: '#ffaa00', label: 'PERSON' },
    vehicle:       { color: '#00ccff', label: 'VEHICLE' },
    emergency:     { color: '#ff0044', label: 'AMBULANCE' },
    animal:        { color: '#88ff44', label: 'ANIMAL' },
    ball:          { color: '#ffff00', label: 'BALL' },
  },

  // Confidence multiplier by time-of-day
  CONFIDENCE_MULTIPLIER: {
    daylight: 1.0,
    dusk: 0.7,
    night: 0.25,
  },

  OCCLUSION_PENALTY: 0.3,
  BASE_CONFIDENCE: 0.82,
  WEATHER_RAIN_PENALTY: 0.15,
  WEATHER_FOG_PENALTY: 0.25,
};

// === SHARED ===
export const SENSOR_SHARED = {
  WEATHER: { CLEAR: 'clear', RAIN: 'rain', FOG: 'fog' },
  TIME_OF_DAY: { DAYLIGHT: 'daylight', DUSK: 'dusk', NIGHT: 'night' },
};
