import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SimulationState } from '@/types';

export const useSimulationStore = create<SimulationState>()(
  devtools((set) => ({
    enabled: false,
    vehicleCount: 60,
    tickIntervalMs: 1000,
    label: 'SIMULATION',

    start: (count = 60) => set({ enabled: true, vehicleCount: count, label: 'SIMULATION' }),
    stop: () => set({ enabled: false, label: 'SIMULATION' }),
    setTickInterval: (ms: number) => set({ tickIntervalMs: ms }),
    toggle: () => set((state) => ({ enabled: !state.enabled })),
  })),
);
