/**
 * WebSocket telemetry client for SafeRoute AI.
 *
 * Connects to the FastAPI backend /api/v1/ws/telemetry to receive live vehicle
 * position updates. When the backend is unavailable, the client silently falls
 * back to the locally-run simulation (see useSimulationStore) — no coordinates
 * are ever fabricated and presented as real.
 */

export type TelemetryMessage =
  | { type: 'vehicle_update'; payload: VehicleUpdate }
  | { type: 'traffic_update'; payload: TrafficUpdate }
  | { type: 'event'; payload: TrafficEvent }
  | { type: 'ack'; payload: { status: string } };

export interface VehicleUpdate {
  id: string;
  category: string;
  label: string;
  position: [number, number, number];
  heading: number;
  speed: number;
  lastUpdate: string;
  dataSource: 'gps_telemetry' | 'camera_feed' | 'authorized_feed' | 'simulation';
  isEmergency: boolean;
}

export interface TrafficUpdate {
  roadId: string;
  congestion: string;
  vehicleCount: number;
  avgSpeed: number;
  flowDirection: number;
  signalStatus?: string;
}

export interface TrafficEvent {
  id: string;
  type: string;
  severity: string;
  position: [number, number];
  title: string;
  description: string;
  status: string;
}

class TelemetryClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: number | null = null;
  private listeners = new Set<(msg: TelemetryMessage) => void>();
  private connected = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.connected = true;
        this.listeners.forEach((cb) =>
          cb({ type: 'ack', payload: { status: 'connected' } }),
        );
      };
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as TelemetryMessage;
          this.listeners.forEach((cb) => cb(msg));
        } catch {
          // ignore malformed messages
        }
      };
      this.ws.onclose = () => {
        this.connected = false;
        this.ws = null;
        this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 3000) as any;
  }

  subscribe(cb: (msg: TelemetryMessage) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected() {
    return this.connected;
  }
}

export const telemetry = new TelemetryClient(
  import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/api/v1/ws/telemetry',
);
