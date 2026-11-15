import type { Entity } from 'cesium';

export type VehicleCategory =
  | 'car'
  | 'bus'
  | 'motorcycle'
  | 'truck'
  | 'ambulance'
  | 'fire_engine'
  | 'police';

export type DataSource = 'gps_telemetry' | 'camera_feed' | 'authorized_feed' | 'simulation';

export type CongestionLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown';

export interface Vehicle {
  id: string;
  category: VehicleCategory;
  label: string;
  position: [number, number, number];
  heading: number;
  speed: number;
  speedLimit?: number;
  lastUpdate: string;
  dataSource: DataSource;
  routeId?: string;
  routeProgress?: number;
  roadProgress?: number;
  isEmergency: boolean;
  entity?: Entity;
  trackingHistory: number[][];
}

export interface RoadSegment {
  id: string;
  name: string;
  type: string;
  coordinates: number[][];
  congestion: CongestionLevel;
  vehicleCount: number;
  avgSpeed: number;
  flowDirection: number;
  signalStatus?: 'red' | 'yellow' | 'green' | 'unknown';
}

export interface TrafficEvent {
  id: string;
  type: 'accident' | 'congestion' | 'road_closure' | 'emergency' | 'signal_fault';
  severity: 'low' | 'medium' | 'high' | 'critical';
  position: [number, number];
  title: string;
  description: string;
  reportedAt: string;
  status: 'active' | 'resolved';
  roadsAffected: string[];
}

export interface CameraPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  action: 'city-overview' | 'street-level' | 'intersection' | 'accident' | 'emergency';
  targetId?: string;
  flyToOptions?: any;
}

export interface SimulationState {
  enabled: boolean;
  vehicleCount: number;
  tickIntervalMs: number;
  label: 'SIMULATION' | 'LIVE';
  start: (count?: number) => void;
  stop: () => void;
  setTickInterval: (ms: number) => void;
  toggle: () => void;
}

export interface MapStore {
  cesiumViewer: any | null;
  cameraMode: 'perspective' | 'top-down';
  selectedId: string | null;
  selectedRoadId: string | null;
  activePreset: string | null;
  setViewer: (viewer: any) => void;
  setCameraMode: (mode: 'perspective' | 'top-down') => void;
  selectVehicle: (id: string | null) => void;
  selectRoad: (id: string | null) => void;
  setActivePreset: (id: string | null) => void;
  flyToPreset: (presetId: string) => void;
  resetCamera: () => void;
  setTopDown: () => void;
  setPerspective: () => void;
}

export interface UIState {
  sidebarOpen: boolean;
  notificationsOpen: boolean;
  panelMode: 'vehicles' | 'traffic' | 'events' | 'settings' | null;
  setSidebarOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setPanelMode: (mode: UIState['panelMode']) => void;
  toggleSidebar: () => void;
}

export interface VehiclesState {
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

export interface TrafficState {
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

export interface SimulationStore extends SimulationState {}

export const CONGESTION_COLORS: Record<CongestionLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  heavy: '#f59e0b',
  severe: '#ef4444',
  unknown: '#64748b',
};

