// ============================================================
// Vehicle Store — Vehicle runtime state
// Position, heading, speed, steering, inputs.
// Physics tick is a pure function in systems/vehicle/vehiclePhysics.js
// ============================================================

import { create } from 'zustand';
import { VEHICLE_START } from '../constants/vehicle.js';

const useVehicleStore = create((set) => ({
  // Position in world space [x, y, z]
  position: [...VEHICLE_START.POSITION],

  // Y-axis rotation (radians). Three.js convention:
  // 0 = faces +Z (south), -PI/2 = faces +X (east)
  heading: VEHICLE_START.HEADING,

  // Current speed in m/s (positive = forward, negative = reverse)
  speed: 0,

  // Current steering angle (radians, positive = left, negative = right)
  steerAngle: 0,

  // Input state — set by InputHandler, read by physics tick
  inputs: {
    accelerate: false,   // W or ArrowUp
    brake: false,        // S or ArrowDown
    steerLeft: false,    // A or ArrowLeft
    steerRight: false,   // D or ArrowRight
  },

  // Derived / display state
  speedMph: 0,
  currentZone: 'city',
  gear: 'P',

  // --- Actions ---

  setInput: (key, value) => set((s) => ({
    inputs: { ...s.inputs, [key]: value },
  })),

  // Called by physics system each frame with computed new state
  applyPhysicsState: (newState) => set(newState),

  // Reset to starting position
  reset: () => set({
    position: [...VEHICLE_START.POSITION],
    heading: VEHICLE_START.HEADING,
    speed: 0,
    steerAngle: 0,
    speedMph: 0,
    currentZone: 'city',
    gear: 'P',
    inputs: {
      accelerate: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
    },
  }),
}));

export default useVehicleStore;
