import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import * as Cesium from 'cesium';
import type { MapStore, CameraPreset } from '@/types';

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'city-overview', label: 'City Overview', icon: 'Globe', description: 'Wide city-wide perspective', action: 'city-overview' },
  { id: 'street-level', label: 'Street Level', icon: 'Navigation', description: 'Low-angle street view', action: 'street-level' },
  { id: 'intersection', label: 'Intersection', icon: 'Plus', description: 'Focus on active intersection', action: 'intersection' },
  { id: 'accident', label: 'Accident Location', icon: 'AlertCircle', description: 'Focus on nearest accident', action: 'accident', targetId: 'accident-1' },
  { id: 'emergency', label: 'Emergency Response', icon: 'ShieldAlert', description: 'Focus on emergency vehicles', action: 'emergency' },
];

export const useMapStore = create<MapStore>()(
  devtools((set, get) => ({
    cesiumViewer: null as Cesium.Viewer | null,
    cameraMode: 'perspective',
    selectedVehicleId: null as string | null,
    selectedRoadId: null as string | null,
    activePreset: null as string | null,

    setViewer: (viewer: Cesium.Viewer) => set({ cesiumViewer: viewer }),
    setCameraMode: (mode: MapStore['cameraMode']) => set({ cameraMode: mode }),
    selectVehicle: (id: string | null) => set({ selectedVehicleId: id }),
    selectRoad: (id: string | null) => set({ selectedRoadId: id }),
    setActivePreset: (id: string | null) => set({ activePreset: id }),

    flyToPreset: (presetId: string) => {
      const { cesiumViewer } = get();
      if (!cesiumViewer) return;
      const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      switch (preset.action) {
        case 'city-overview':
          cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(-122.3935, 37.788, 1200), orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-45), roll: 0 }, duration: 3.5 });
          break;
        case 'street-level':
          cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(-122.3935, 37.7882, 60), orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-25), roll: 0 }, duration: 3.0 });
          break;
        case 'intersection':
          cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(-122.3935, 37.7882, 250), orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-60), roll: 0 }, duration: 3.0 });
          break;
        case 'accident':
        case 'emergency':
          cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(-122.3935, 37.7882, 400), orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-55), roll: 0 }, duration: 3.0 });
          break;
      }
      set({ activePreset: presetId });
    },

    resetCamera: () => { const { cesiumViewer } = get(); if (!cesiumViewer) return; cesiumViewer.camera.flyToHome({ duration: 3.0 }); },

    setTopDown: () => {
      const { cesiumViewer } = get(); if (!cesiumViewer) return;
      const cartographic = cesiumViewer.camera.positionCartographic;
      cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 700), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }, duration: 2.0 });
      set({ cameraMode: 'top-down' });
    },

    setPerspective: () => {
      const { cesiumViewer } = get(); if (!cesiumViewer) return;
      cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(-122.3935, 37.7882, 600), orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-45), roll: 0 }, duration: 2.5 });
      set({ cameraMode: 'perspective' });
    },
  })),
);
