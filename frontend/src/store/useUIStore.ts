import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  notificationsOpen: boolean;
  panelMode: 'vehicles' | 'traffic' | 'events' | 'settings' | null;
  setSidebarOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setPanelMode: (mode: UIState['panelMode']) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  devtools((set) => ({
    sidebarOpen: true,
    notificationsOpen: false,
    panelMode: null,

    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setNotificationsOpen: (open) => set({ notificationsOpen: open }),
    setPanelMode: (mode) => set({ panelMode: mode }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  })),
);
