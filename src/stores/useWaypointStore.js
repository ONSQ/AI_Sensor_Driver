import { create } from 'zustand';

const useWaypointStore = create((set) => ({
    isDesignerMode: false,
    customWaypoints: [], // Array of { id: string, position: [x, y, z] }

    toggleDesignerMode: () => set((state) => ({ isDesignerMode: !state.isDesignerMode })),

    addWaypoint: (position) => set((state) => ({
        customWaypoints: [
            ...state.customWaypoints,
            { id: `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, position }
        ]
    })),

    removeWaypoint: (id) => set((state) => ({
        customWaypoints: state.customWaypoints.filter(wp => wp.id !== id)
    })),

    clearWaypoints: () => set({ customWaypoints: [] }),
}));

export default useWaypointStore;
