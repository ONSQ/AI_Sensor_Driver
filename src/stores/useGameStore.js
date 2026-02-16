import { create } from 'zustand';

export const PHASES = {
  MENU: 'menu',
  PHASE_A: 'phaseA',
  QUIZ_BREAK: 'quizBreak',
  PHASE_B: 'phaseB',
  RESULTS: 'results',
};

const useGameStore = create((set, get) => ({
  phase: PHASES.MENU,
  timeRemaining: 600,
  score: 0,
  isRunning: false,
  seed: 12345,

  setSeed: (seed) => set({ seed }),
  setPhase: (phase) => set({ phase }),
  startGame: () => set({ phase: PHASES.PHASE_A, isRunning: true, timeRemaining: 600, score: 0 }),
  tick: (delta) => {
    const { timeRemaining, isRunning } = get();
    if (!isRunning) return;
    const newTime = Math.max(0, timeRemaining - delta);
    set({ timeRemaining: newTime });
    if (newTime <= 0) {
      set({ isRunning: false });
    }
  },
  addScore: (points) => set((s) => ({ score: s.score + points })),
}));

export default useGameStore;
