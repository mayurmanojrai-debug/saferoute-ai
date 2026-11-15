import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { RoadSegment, TrafficEvent, CongestionLevel } from '@/types';

export const CONGESTION_COLORS: Record<CongestionLevel, string> = {
  low: '#22c55e',        // green
  moderate: '#eab308',   // yellow
  heavy: '#f59e0b',      // orange
  severe: '#ef4444',     // red
  unknown: '#64748b',    // slate
};

interface TrafficState {
  roads: Map<string, RoadSegment>;
  events: TrafficEvent[];
  setRoads: (roads: RoadSegment[]) => void;
  upsertRoad: (road: RoadSegment) => void;
  setEvents: (events: TrafficEvent[]) => void;
  addEvent: (event: TrafficEvent) => void;
  resolveEvent: (id: string) => void;
  getRoad: (id: string) => RoadSegment | undefined;
  congestionColor: (level: CongestionLevel) => string;
}

export const useTrafficStore = create<TrafficState>()(
  devtools((set, get) => ({
    roads: new Map(),
    events: [],

    setRoads: (roads) => {
      const map = new Map<string, RoadSegment>();
      roads.forEach((r) => map.set(r.id, r));
      set({ roads: map });
    },

    upsertRoad: (road) =>
      set((state) => {
        const next = new Map(state.roads);
        next.set(road.id, road);
        return { roads: next };
      }),

    setEvents: (events) => set({ events }),

    addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),

    resolveEvent: (id) =>
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? { ...e, status: 'resolved' } : e)),
      })),

    getRoad: (id) => get().roads.get(id),

    congestionColor: (level) => CONGESTION_COLORS[level],
  })),
);
