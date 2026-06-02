import { create } from "zustand";
import { DEMO_DURATION_SECONDS } from "@/lib/cascade-script";

type DemoStore = {
  elapsed: number;
  isPlaying: boolean;
  setElapsed: (elapsed: number) => void;
  togglePlaying: () => void;
  reset: () => void;
};

export const useDemoStore = create<DemoStore>((set) => ({
  elapsed: 0,
  isPlaying: true,
  setElapsed: (elapsed) => set({ elapsed: Math.min(DEMO_DURATION_SECONDS, Math.max(0, elapsed)) }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  reset: () => set({ elapsed: 0, isPlaying: true }),
}));
