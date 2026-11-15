import { useEffect } from 'react';\r\nimport { useMapStore } from './store/useMapStore';\r\nimport { useVehiclesStore } from './store/useVehiclesStore';\r\nimport { useTrafficStore } from './store/useTrafficStore';\r\nimport MapView from './components/MapView';
import Toolbar from './components/Toolbar';
import CameraControls from './components/CameraControls';
import VehiclePanel from './components/VehiclePanel';
import RoadPanel from './components/RoadPanel';
import TrafficLegend from './components/TrafficLegend';
import SimulationBanner from './components/SimulationBanner';
import EventNotifications from './components/EventNotifications';

export default function App() {
  const { setViewer } = useMapStore();
  const { setVehicles } = useVehiclesStore();
  const { setRoads } = useTrafficStore();

  // Initialize demo data (clearly labelled simulation) on mount.
  useEffect(() => {
    const demoVehicles = generateDemoVehicles();
    setVehicles(demoVehicles);
    setRoads(generateDemoRoads());
    console.info('[SafeRoute AI] Demo/simulation data loaded.');
  }, [setVehicles, setRoads]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <MapView onViewerReady={setViewer} />

      {/* Overlay UI layer */}
      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col">
        <Toolbar />
        <CameraControls />
        <SimulationBanner />
        <TrafficLegend />
      </div>

      {/* Right-side detail panels (pointer-events re-enabled on panels) */}
      <div className="pointer-events-auto fixed inset-0 z-60 flex h-full w-full">
        <VehiclePanel />
        <RoadPanel />
        <EventNotifications />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo data helpers — clearly labelled simulation / sample data       */
/* ------------------------------------------------------------------ */

const CENTER = [-122.3935, 37.7882] as [number, number];

function generateDemoVehicles(): any[] {
  const categories = [
    { cat: 'car', label: 'C-4421', emer: false },
    { cat: 'bus', label: 'MUNI 8142', emer: false },
    { cat: 'car', label: 'C-1109', emer: false },
    { cat: 'truck', label: 'FEDEX T-7', emer: false },
    { cat: 'ambulance', label: 'MEDIC 3', emer: true },
    { cat: 'police', label: 'SFPD 12', emer: true },
    { cat: 'motorcycle', label: 'POLICE M-1', emer: true },
    { cat: 'fire_engine', label: 'ENGINE 9', emer: true },
    { cat: 'car', label: 'C-7731', emer: false },
    { cat: 'bus', label: 'MUNI 8011', emer: false },
  ];

  return categories.map((v, i) => {
    const angle = (i / categories.length) * 2 * Math.PI;
    const r = 0.003;
    return {
      id: `veh-${i + 1}`,
      category: v.cat as any,
      label: v.label,
      position: [CENTER[0] + Math.cos(angle) * r, CENTER[1] + Math.sin(angle) * r, 0],
      heading: (angle * 180) / Math.PI,
      speed: v.emer ? 45 + i * 2 : 22 + i * 3,
      lastUpdate: new Date().toISOString(),
      dataSource: 'simulation' as any,
      isEmergency: v.emer,
      trackingHistory: [],
    };
  });
}

function generateDemoRoads(): any[] {
  const base = CENTER;
  return [
    {
      id: 'rd-market-1',
      name: 'Market Street',
      type: 'primary',
      coordinates: [
        [base[0] - 0.004, base[1]],
        [base[0] - 0.002, base[1]],
        [base[0], base[1]],
        [base[0] + 0.002, base[1]],
        [base[0] + 0.004, base[1]],
      ],
      congestion: 'low' as any,
      vehicleCount: 12,
      avgSpeed: 38,
      flowDirection: 90,
      signalStatus: 'green' as any,
    },
    {
      id: 'rd-3rd-1',
      name: '3rd Street',
      type: 'secondary',
      coordinates: [
        [base[0], base[1] - 0.004],
        [base[0], base[1] - 0.002],
        [base[0], base[1]],
        [base[0], base[1] + 0.002],
        [base[0], base[1] + 0.004],
      ],
      congestion: 'moderate' as any,
      vehicleCount: 24,
      avgSpeed: 24,
      flowDirection: 0,
      signalStatus: 'yellow' as any,
    },
    {
      id: 'rd-mission-1',
      name: 'Mission Street',
      type: 'primary',
      coordinates: [
        [base[0] - 0.004, base[1] + 0.0025],
        [base[0] - 0.002, base[1] + 0.0015],
        [base[0], base[1] + 0.001],
        [base[0] + 0.002, base[1] + 0.002],
        [base[0] + 0.004, base[1] + 0.003],
      ],
      congestion: 'heavy' as any,
      vehicleCount: 41,
      avgSpeed: 12,
      flowDirection: 90,
      signalStatus: 'red' as any,
    },
    {
      id: 'rd-emerald-1',
      name: 'Emerald Lane',
      type: 'residential',
      coordinates: [
        [base[0] - 0.003, base[1] - 0.003],
        [base[0] - 0.001, base[1] - 0.002],
        [base[0] + 0.001, base[1] - 0.001],
      ],
      congestion: 'low' as any,
      vehicleCount: 4,
      avgSpeed: 32,
      flowDirection: 45,
      signalStatus: 'unknown' as any,
    },
  ];
}


