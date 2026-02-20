// ============================================================
// Entity Store — Zustand store for animated world entities
// Holds entity array, init/tick actions, entity accessors.
// ============================================================

import { create } from 'zustand';
import { spawnEntities } from '../systems/entities/entityManager.js';
import { tickEntities } from '../systems/entities/entityManager.js';

const useEntityStore = create((set, get) => ({
  entities: [],
  initialized: false,

  /**
   * Spawn all entities deterministically from seed + worldData.
   * Called once per seed (via useMemo in CityWorld).
   */
  initEntities: (seed, worldData) => {
    const entities = spawnEntities(seed, worldData);
    set({ entities, initialized: true });
  },

  /**
   * Tick all entity behaviors.
   * @param {number} delta — seconds since last frame
   * @param {object} trafficState — traffic store state (for light checks)
   * @param {number[]} playerPosition — vehicle [x, y, z]
   */
  tick: (delta, trafficState, playerPosition) => {
    const { entities } = get();
    if (entities.length === 0) return;
    const updated = tickEntities(entities, delta, trafficState, playerPosition);
    set({ entities: updated });
  },

  /**
   * Reset entity state (e.g., on game restart).
   */
  reset: () => set({ entities: [], initialized: false }),
}));

export default useEntityStore;
