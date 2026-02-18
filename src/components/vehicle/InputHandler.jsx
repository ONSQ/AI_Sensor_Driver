// ============================================================
// InputHandler — Keyboard input for vehicle driving
// W/Up = accelerate, S/Down = brake, A/Left = steer left, D/Right = steer right
// Sets input flags on useVehicleStore. Physics reads them per frame.
// ============================================================

import { useEffect } from 'react';
import useVehicleStore from '../../stores/useVehicleStore.js';

// Map key codes to input action names
const KEY_MAP = {
  KeyW: 'accelerate',
  ArrowUp: 'accelerate',
  KeyS: 'brake',
  ArrowDown: 'brake',
  KeyA: 'steerLeft',
  ArrowLeft: 'steerLeft',
  KeyD: 'steerRight',
  ArrowRight: 'steerRight',
};

export default function InputHandler() {
  useEffect(() => {
    const setInput = useVehicleStore.getState().setInput;

    function onKeyDown(e) {
      const action = KEY_MAP[e.code];
      if (action) {
        e.preventDefault();
        setInput(action, true);
      }
    }

    function onKeyUp(e) {
      const action = KEY_MAP[e.code];
      if (action) {
        e.preventDefault();
        setInput(action, false);
      }
    }

    // Clear all inputs on window blur (prevents stuck keys on tab switch)
    function onBlur() {
      const set = useVehicleStore.getState().setInput;
      set('accelerate', false);
      set('brake', false);
      set('steerLeft', false);
      set('steerRight', false);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return null;
}
