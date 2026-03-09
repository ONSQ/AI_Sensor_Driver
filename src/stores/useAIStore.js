// ============================================================
// AI Store — State for the Glass Box UI and Simulation Controls
// Holds the live output of the AIDriver evaluation tick
// ============================================================

import { create } from 'zustand';

const useAIStore = create((set) => ({
    // Playback state
    isPaused: false,
    timeScale: 1.0,

    // Live output for Glass Box Visualization Panels
    glassboxData: null,

    // Action log for Rewind/Narration UI
    narrationLog: [],

    // Actions
    togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
    setTimeScale: (scale) => set({ timeScale: scale }),

    updateGlassboxData: (data) => set((s) => {
        // Optionally create a running log 
        const qValues = data.decision?.allScores
            ? data.decision.allScores.map((s) => ({ action: s.action, score: s.score }))
            : null;

        const logEntry = {
            timestamp: Date.now(),
            action: data.action,
            isOverride: data.isOverride,
            confidence: data.perception?.confidence || 0,
            reason: data.safety ? data.safety.reason : 'Utility routing',
            policyType: data.isOverride ? 'safety' : (data.decision?.engineType || 'unknown'),
            qValues,
            stateSnapshot: data.worldState || null,
        };

        return {
            glassboxData: data,
            narrationLog: [logEntry, ...s.narrationLog].slice(0, 50) // keep last 50
        };
    }),

    resetPlayback: () => set({ isPaused: false, timeScale: 1.0, narrationLog: [] })
}));

export default useAIStore;
