// ============================================================
// Traffic Store — Traffic light state cycling
// Manages a global clock that drives all traffic light states.
// ============================================================

import { create } from 'zustand';
import { LIGHT_STATE, LIGHT_TIMING } from '../constants/traffic.js';

const { GREEN_DURATION, YELLOW_DURATION, CYCLE_LENGTH, EW_OFFSET, NS_OFFSET } = LIGHT_TIMING;

/**
 * Derive light state from a clock value and axis offset.
 * @param {number} clock — global elapsed time in seconds
 * @param {string} axis — 'ew' or 'ns'
 * @returns {string} — LIGHT_STATE value
 */
function deriveLightState(clock, axis) {
  const offset = axis === 'ew' ? EW_OFFSET : NS_OFFSET;
  const t = ((clock + offset) % CYCLE_LENGTH + CYCLE_LENGTH) % CYCLE_LENGTH;

  if (t < GREEN_DURATION) {
    return LIGHT_STATE.GREEN;
  } else if (t < GREEN_DURATION + YELLOW_DURATION) {
    return LIGHT_STATE.YELLOW;
  } else {
    return LIGHT_STATE.RED;
  }
}

const useTrafficStore = create((set, get) => ({
  clock: 0,

  /**
   * Advance the traffic clock.
   * @param {number} delta — seconds since last frame
   */
  tick: (delta) => {
    set((s) => ({ clock: s.clock + delta }));
  },

  /**
   * Get the current light state for a given axis.
   * @param {'ew'|'ns'} axis
   * @returns {string} LIGHT_STATE value
   */
  getLightState: (axis) => {
    return deriveLightState(get().clock, axis);
  },

  /**
   * Check if a specific direction is red at a given intersection.
   * Used by future scoring/collision system.
   * @param {'ew'|'ns'} axis
   * @returns {boolean}
   */
  isRed: (axis) => {
    return deriveLightState(get().clock, axis) === LIGHT_STATE.RED;
  },

  /**
   * Reset clock (e.g., on game restart).
   */
  reset: () => set({ clock: 0 }),
}));

// Export the derive function for use in components that subscribe via selector
export { deriveLightState };

export default useTrafficStore;
