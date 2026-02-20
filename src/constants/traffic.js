// ============================================================
// Traffic Infrastructure Constants
// ============================================================

// Traffic light states
export const LIGHT_STATE = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
};

// Traffic light timing (seconds)
export const LIGHT_TIMING = {
  GREEN_DURATION: 8,
  YELLOW_DURATION: 2,
  RED_DURATION: 10,
  CYCLE_LENGTH: 20,        // green + yellow + red
  EW_OFFSET: 0,            // east-west roads start at 0
  NS_OFFSET: 10,           // north-south roads start offset by half cycle
};

// Traffic light physical dimensions (meters)
export const TRAFFIC_LIGHT_DIMS = {
  POLE_RADIUS: 0.08,
  POLE_HEIGHT: 4.5,
  HOUSING_WIDTH: 0.4,
  HOUSING_HEIGHT: 1.2,
  HOUSING_DEPTH: 0.3,
  LIGHT_RADIUS: 0.12,
  LIGHT_SPACING: 0.35,     // vertical spacing between lights
  CORNER_OFFSET: 6.0,      // offset from intersection center to place pole (road is 10m wide, so half is 5m)
};

// Traffic light colors
export const TRAFFIC_LIGHT_COLORS = {
  POLE: '#555555',
  HOUSING: '#222222',
  GREEN_ON: '#00ff44',
  GREEN_OFF: '#003311',
  YELLOW_ON: '#ffdd00',
  YELLOW_OFF: '#332200',
  RED_ON: '#ff2200',
  RED_OFF: '#330500',
};

// Stop sign dimensions
export const STOP_SIGN_DIMS = {
  POLE_RADIUS: 0.06,
  POLE_HEIGHT: 2.8,
  SIGN_RADIUS: 0.4,
  SIGN_THICKNESS: 0.03,
  CORNER_OFFSET: 6.0,
};

export const STOP_SIGN_COLORS = {
  POLE: '#888888',
  SIGN_FACE: '#cc0000',
  SIGN_BORDER: '#ffffff',
};

// Zone prop dimensions
export const PROP_DIMS = {
  // Traffic cone
  CONE_RADIUS: 0.15,
  CONE_HEIGHT: 0.7,
  CONE_BASE_RADIUS: 0.2,

  // Barrier
  BARRIER_WIDTH: 1.8,
  BARRIER_HEIGHT: 0.9,
  BARRIER_DEPTH: 0.15,
  BARRIER_LEG_HEIGHT: 0.5,

  // Zone sign
  SIGN_POLE_RADIUS: 0.05,
  SIGN_POLE_HEIGHT: 2.5,
  SIGN_WIDTH: 0.6,
  SIGN_HEIGHT: 0.6,

  // Hospital cross
  CROSS_SIZE: 0.8,
  CROSS_THICKNESS: 0.25,
  CROSS_DEPTH: 0.1,
  CROSS_POLE_HEIGHT: 3,
};

export const PROP_COLORS = {
  CONE_ORANGE: '#ff6600',
  CONE_BASE: '#333333',
  BARRIER_ORANGE: '#ff8800',
  BARRIER_WHITE: '#ffffff',
  SCHOOL_SIGN: '#ffcc00',
  HOSPITAL_CROSS: '#ff0000',
  SIGN_POLE: '#888888',
  SPEED_SIGN_BG: '#ffffff',
  SPEED_SIGN_BORDER: '#333333',
  SPEED_SIGN_TEXT: '#111111',
};

// Speed limits per zone (mph) — US traffic law
export const SPEED_LIMITS = {
  city: 35,
  residential: 25,
  school: 20,
  hospital: 15,
  construction: 25,
};

// Speed limit sign dimensions
export const SPEED_SIGN_DIMS = {
  POLE_RADIUS: 0.05,
  POLE_HEIGHT: 2.5,
  SIGN_WIDTH: 0.65,
  SIGN_HEIGHT: 0.8,
  SIGN_THICKNESS: 0.03,
  BORDER_WIDTH: 0.04,       // black border inset
};
