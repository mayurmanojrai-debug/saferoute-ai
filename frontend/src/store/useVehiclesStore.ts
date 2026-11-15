import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Vehicle } from '@/types';

interface VehiclesState {
  vehicles: Map<string, Vehicle>;
  selectedId: string | null;
  setVehicles: (vehicles: Vehicle[]) => void;
  upsertVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: string) => void;
  selectVehicle: (id: string | null) => void;
  updatePosition: (id: string, position: [number, number, number], heading: number, speed: number) => void;
  getVehicle: (id: string) => Vehicle | undefined;
  setAllPositions: (updates: { id: string; position: [number, number, number]; heading: number; speed: number }[]) => void;
}

export const useVehiclesStore = create<VehiclesState>()(
  devtools((set, get) => ({
    vehicles: new Map(),
    selectedId: null,

    setVehicles: (vehicles) => {
      const map = new Map<string, Vehicle>();
      vehicles.forEach((v) => map.set(v.id, v));
      set({ vehicles: map });
    },

    upsertVehicle: (vehicle) =>
      set((state) => {
        const next = new Map(state.vehicles);
        const existing = next.get(vehicle.id);
        const history = existing ? [...existing.trackingHistory] : [];
        history.push([vehicle.position[0], vehicle.position[1]]);
        if (history.length > 120) history.shift();
        next.set(vehicle.id, { ...vehicle, trackingHistory: history });
        return { vehicles: next };
      }),

    removeVehicle: (id) =>
      set((state) => {
        const next = new Map(state.vehicles);
        next.delete(id);
        return { vehicles: next, selectedId: state.selectedId === id ? null : state.selectedId };
      }),

    selectVehicle: (id) => set({ selectedId: id }),

    updatePosition: (id, position, heading, speed) =>
      set((state) => {
        const next = new Map(state.vehicles);
        const v = next.get(id);
        if (!v) return state;
        const history = [...v.trackingHistory, [position[0], position[1]]];
        if (history.length > 120) history.shift();
        next.set(id, { ...v, position, heading, speed, trackingHistory: history });
        return { vehicles: next };
      }),

    getVehicle: (id) => get().vehicles.get(id),

    setAllPositions: (updates) =>
      set((state) => {
        const next = new Map(state.vehicles);
        for (const u of updates) {
          const v = next.get(u.id);
          if (!v) continue;
          const history = [...v.trackingHistory, [u.position[0], u.position[1]]];
          if (history.length > 120) history.shift();
          next.set(u.id, { ...v, position: u.position, heading: u.heading, speed: u.speed, trackingHistory: history });
        }
        return { vehicles: next };
      }),
  })),
);

