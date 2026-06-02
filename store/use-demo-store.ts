import { create } from "zustand";
import { DEMO_DURATION_SECONDS, type DemoEvent } from "@/lib/cascade-script";
import type { RelayConnectionStatus } from "@/lib/relay-protocol";

type DemoStore = {
  elapsed: number;
  isPlaying: boolean;
  liveEvents: DemoEvent[];
  relayStatus: RelayConnectionStatus;
  setElapsed: (elapsed: number) => void;
  togglePlaying: () => void;
  setRelayStatus: (relayStatus: RelayConnectionStatus) => void;
  ingestRelayEvent: (event: DemoEvent) => void;
  replaceLiveEvents: (events: DemoEvent[]) => void;
  reset: () => void;
};

function sortEvents(events: DemoEvent[]) {
  return [...events].sort((left, right) => left.at - right.at);
}

export const useDemoStore = create<DemoStore>((set) => ({
  elapsed: 0,
  isPlaying: true,
  liveEvents: [],
  relayStatus: "scripted",
  setElapsed: (elapsed) => set({ elapsed: Math.min(DEMO_DURATION_SECONDS, Math.max(0, elapsed)) }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setRelayStatus: (relayStatus) => set({ relayStatus }),
  ingestRelayEvent: (event) =>
    set((state) => {
      const withoutDuplicate = state.liveEvents.filter((candidate) => candidate.id !== event.id);
      return { liveEvents: sortEvents([...withoutDuplicate, event]) };
    }),
  replaceLiveEvents: (events) => set({ liveEvents: sortEvents(events) }),
  reset: () => set({ elapsed: 0, isPlaying: true, liveEvents: [], relayStatus: "scripted" }),
}));
