// ============================================================
// Vehicle Constants — SensorRacer v2
// Physical dimensions, physics tuning, colors, camera settings.
// ============================================================

// Vehicle physical dimensions (meters) — simple box car
export const VEHICLE_DIMS = {
  BODY_LENGTH: 4.2,       // Z-axis extent (front to back)
  BODY_WIDTH: 1.8,        // X-axis extent
  BODY_HEIGHT: 1.2,       // main body box height
  BODY_Y_OFFSET: 0.4,     // bottom of body above ground (axle clearance)

  CABIN_LENGTH: 2.2,      // cabin/windshield box length
  CABIN_WIDTH: 1.7,       // slightly narrower than body
  CABIN_HEIGHT: 0.9,      // cabin height
  CABIN_Z_OFFSET: -0.3,   // cabin center offset from body center (toward front)

  WHEEL_RADIUS: 0.35,
  WHEEL_WIDTH: 0.2,
  WHEEL_SEGMENTS: 12,     // cylinder radial segments
  WHEELBASE: 2.6,         // front-to-rear axle distance
  TRACK_WIDTH: 1.6,       // left-to-right wheel distance

  // Driver eye position relative to vehicle origin (center bottom)
  EYE_HEIGHT: 1.5,        // meters above ground
  EYE_FORWARD: 0.3,       // meters forward from vehicle center
  EYE_LEFT: 0.35,         // meters left of center (left-hand drive, US)
};

// Arcade physics tuning — no rigid body engine
export const VEHICLE_PHYSICS = {
  MAX_SPEED: 20.12,       // ~45 mph in m/s
  ACCELERATION: 6.0,      // m/s^2 when W/up pressed
  BRAKE_DECEL: 12.0,      // m/s^2 when S/down pressed (braking)
  REVERSE_MAX_SPEED: 3.0, // m/s max reverse
  FRICTION_DECEL: 2.0,    // m/s^2 natural deceleration (no input)

  // Steering
  MAX_STEER_ANGLE: Math.PI / 6,   // 30 degrees max wheel turn
  STEER_SPEED: 2.5,               // radians/sec — how fast wheels turn
  STEER_RETURN_SPEED: 4.0,        // radians/sec — wheel centering speed
  MIN_TURN_SPEED: 0.5,            // m/s — below this, no steering effect

  // Unit conversions
  MPS_TO_MPH: 2.23694,            // multiply m/s by this to get mph
  MPH_TO_MPS: 0.44704,            // multiply mph by this to get m/s
};

// Starting position: right lane of EW road at intersection row 2, cols 0–1
// Intersection (2,0): x = -105 + 5 + 0*50 = -100, z = -105 + 5 + 2*50 = 0
// Intersection (2,1): x = -105 + 5 + 1*50 = -50
// Road segment center: x = -75, z = 0
// Right lane for eastbound (+X): z = 0 + 1.5 = 1.5 (south side)
// Heading -PI/2: faces +X (east) in Three.js Y-rotation convention
export const VEHICLE_START = {
  POSITION: [-75, 0, 1.5],
  HEADING: -Math.PI / 2,
};

// Vehicle colors — dark sci-fi theme
export const VEHICLE_COLORS = {
  BODY: '#2a4a6a',          // dark blue-steel
  CABIN: '#1a1a2e',         // dark glass (matches theme)
  CABIN_OPACITY: 0.4,       // semi-transparent windshield
  WHEEL: '#1a1a1a',         // near-black rubber
  HEADLIGHT: '#ffeecc',     // warm headlight color
  TAILLIGHT: '#ff2200',     // red tail
};

// Camera settings
export const CAMERA = {
  FIRST_PERSON_FOV: 75,     // wider FOV for driving immersion
  THIRD_PERSON_FOV: 60,     // moderate FOV for chase cam
  ORBIT_FOV: 50,            // existing orbit FOV
  LERP_FACTOR: 0.1,         // smooth camera interpolation (0–1, lower = smoother)

  // Third-person chase camera offsets (relative to vehicle)
  CHASE_DISTANCE: 12,       // meters behind the vehicle
  CHASE_HEIGHT: 5,          // meters above ground
  CHASE_LOOK_AHEAD: 8,      // meters ahead of vehicle to look at
  CHASE_LOOK_HEIGHT: 1.5,   // height of the look-at target
  CHASE_LERP: 0.06,         // smoother than first-person for cinematic feel
};

// Rearview mirror settings (first-person cockpit)
export const MIRROR = {
  WIDTH: 0.4,              // mirror plane width (meters)
  HEIGHT: 0.12,            // mirror plane height (widescreen ~3.3:1)
  OFFSET_X: 0,             // centered horizontally in camera space
  OFFSET_Y: 0.25,          // above camera center (top of windshield)
  OFFSET_Z: -0.5,          // forward of camera (-Z = forward in camera space)
  FBO_WIDTH: 512,          // texture resolution
  FBO_HEIGHT: 256,
  FRAME_SKIP: 2,           // render every 2nd frame for performance
  FOV: 90,                 // wide rear FOV
  FRAME_COLOR: '#00ff88',  // green accent matching HUD
  FRAME_PADDING: 0.006,    // border thickness around mirror
};
