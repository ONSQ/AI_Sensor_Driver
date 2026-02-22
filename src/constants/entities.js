// ============================================================
// Entity Constants — SensorRacer v2
// Dimensions, speeds, spawn counts, behavior params for all
// animated world entities (pedestrians, NPC vehicles, animals,
// emergency vehicle, ball hazards).
// ============================================================

import { GRID } from './world.js';

// --- Spawn counts ---
export const ENTITY_COUNTS = {
  PEDESTRIANS: 12,          // ~3 per quadrant
  NPC_VEHICLES_PARKED: 10,
  NPC_VEHICLES_MOVING: 6,
  SCHOOL_BUSES: 1,
  ANIMALS: 3,               // 2 dogs + 1 deer
  EMERGENCY_VEHICLES: 1,
  BALL_TRIGGERS: 2,
};

// --- Pedestrian ---
export const PEDESTRIAN = {
  BODY_RADIUS: 0.2,
  BODY_HEIGHT: 1.2,
  HEAD_RADIUS: 0.15,
  WALK_SPEED: 1.2,           // m/s (~2.7 mph)
  CROSS_SPEED: 1.5,          // faster when crossing crosswalk
  COLLISION_RADIUS: 0.3,
  SIDEWALK_OFFSET: 6,        // ± meters from road center (into sidewalk zone)
  THERMAL_TEMP: 36,
  SOUND_TYPE: 'footsteps',
  SOUND_INTENSITY: 0.15,
  SENSOR_CLASS: 'pedestrian',
  // Pedestrian color palette
  COLORS: ['#cc6633', '#8888cc', '#cc4444', '#44aa66', '#ddaa44', '#aa55aa'],
};

// --- NPC Vehicle ---
export const NPC_VEHICLE = {
  BODY_LENGTH: 4.0,
  BODY_WIDTH: 1.7,
  BODY_HEIGHT: 1.1,
  CABIN_LENGTH: 2.0,
  CABIN_WIDTH: 1.6,
  CABIN_HEIGHT: 0.8,
  BODY_Y_OFFSET: 0.35,       // bottom of body above ground
  DRIVE_SPEED: 8.0,           // m/s (~18 mph, conservative)
  COLLISION_HW: 0.85,         // half-width for collision box
  COLLISION_HL: 2.0,          // half-length for collision box
  PARKING_OFFSET: GRID.PARKING_OFFSET, // ± from road center for parked cars
  LANE_OFFSET: 1.5,           // ± from road center for driving lane
  STOP_DISTANCE: 7,           // meters before intersection center to stop
  APPROACH_DISTANCE: 20,      // meters to start checking traffic lights
  THERMAL_TEMP_MOVING: 45,
  THERMAL_TEMP_PARKED: 20,
  SOUND_TYPE: 'engine',
  SOUND_INTENSITY_MOVING: 0.5,
  SOUND_INTENSITY_PARKED: 0,
  SENSOR_CLASS: 'vehicle',
  // NPC vehicle color palette (brighter colors)
  COLORS: ['#ff4444', '#44aa44', '#3366ff', '#ffaacc', '#55ffee', '#ff8822'],
  PARKED_COLORS: ['#aa3333', '#33aa33', '#2255cc', '#cc88aa', '#33ccbb', '#cc6611'],
};

// --- School Bus ---
export const SCHOOL_BUS = {
  BODY_LENGTH: 8.0,
  BODY_WIDTH: 2.0,
  BODY_HEIGHT: 2.2,
  CABIN_LENGTH: 3.0,
  CABIN_WIDTH: 2.0,
  CABIN_HEIGHT: 2.2,
  BODY_Y_OFFSET: 0.5,
  DRIVE_SPEED: 6.0,           // m/s
  COLLISION_HW: 1.0,
  COLLISION_HL: 4.0,
  STOP_DISTANCE: 8,
  APPROACH_DISTANCE: 25,
  THERMAL_TEMP: 45,
  SOUND_TYPE: 'engine',
  SOUND_INTENSITY: 0.6,
  SENSOR_CLASS: 'vehicle',
  COLOR: '#FFD700', // School bus yellow
};

// --- Emergency Vehicle ---
export const EMERGENCY = {
  BODY_LENGTH: 4.5,
  BODY_WIDTH: 1.8,
  BODY_HEIGHT: 1.3,
  CABIN_HEIGHT: 0.9,
  BODY_Y_OFFSET: 0.35,
  DRIVE_SPEED: 12.0,          // m/s (~27 mph) — faster than NPCs
  SIREN_INTENSITY: 0.95,
  FLASH_INTERVAL: 0.3,        // seconds between light color toggles
  COLLISION_HW: 0.9,
  COLLISION_HL: 2.25,
  THERMAL_TEMP: 50,
  SOUND_TYPE: 'siren',
  SOUND_INTENSITY: 0.95,
  SENSOR_CLASS: 'emergency',
  BODY_COLOR: '#eeeeee',
  CROSS_COLOR: '#ff2200',
  LIGHT_RED: '#ff0000',
  LIGHT_BLUE: '#0044ff',
};

// --- Animals ---
export const ANIMAL = {
  DOG: {
    LENGTH: 0.8,
    WIDTH: 0.3,
    HEIGHT: 0.5,
    SPEED: 2.5,
    DART_SPEED: 5.0,
    COLOR: '#8B4513',          // saddle brown
  },
  DEER: {
    LENGTH: 1.5,
    WIDTH: 0.4,
    HEIGHT: 1.2,
    SPEED: 4.0,
    DART_SPEED: 8.0,
    COLOR: '#C4A882',          // tan
  },
  COLLISION_RADIUS: 0.3,
  WANDER_TIME_MIN: 3,         // seconds
  WANDER_TIME_MAX: 8,
  PAUSE_TIME_MIN: 2,
  PAUSE_TIME_MAX: 5,
  DART_CHANCE: 0.05,           // 5% chance per pause cycle
  THERMAL_TEMP: 37,
  SOUND_TYPE: 'barking',
  SOUND_INTENSITY: 0.3,
  SENSOR_CLASS: 'animal',
};

// --- Ball Trigger ---
export const BALL = {
  RADIUS: 0.15,
  ROLL_SPEED: 3.0,            // m/s
  ROLL_DURATION: 3.0,         // seconds
  TRIGGER_DISTANCE: 15,       // meters — player proximity to trigger
  COLOR: '#ff2222',
  COLLISION_RADIUS: 0.15,
  THERMAL_TEMP: 18,
  SOUND_TYPE: 'bouncing',
  SOUND_INTENSITY: 0.2,
  SENSOR_CLASS: 'ball',
};

// --- Collision penalties (score deltas) ---
export const ENTITY_COLLISION = {
  PEDESTRIAN_PENALTY: -500,
  VEHICLE_PENALTY: -200,
  ANIMAL_PENALTY: -150,
  BALL_PENALTY: -25,
  HIT_COOLDOWN_FRAMES: 60,
};
