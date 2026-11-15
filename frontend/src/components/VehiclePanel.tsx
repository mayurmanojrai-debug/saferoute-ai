import { useVehiclesStore } from '@/store/useVehiclesStore';
import { useMapStore } from '@/store/useMapStore';
import { useSimulationStore } from '@/store/useSimulationStore';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CAT_LABEL: Record<string, string> = {
  car: 'Car', bus: 'Bus', motorcycle: 'Motorcycle', truck: 'Truck',
  ambulance: 'Ambulance', fire_engine: 'Fire Engine', police: 'Police Vehicle',
};

const SOURCE_LABEL: Record<string, string> = {
  gps_telemetry: 'GPS Telemetry', camera_feed: 'Camera Feed (AI)',
  authorized_feed: 'Authorized Feed', simulation: 'SIMULATION',
};

export default function VehiclePanel() {
  const { selectedId, selectVehicle } = useMapStore((s) => ({
    selectedId: s.selectedId, selectVehicle: s.selectVehicle,
  }));
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const { label } = useSimulationStore((s) => ({ label: s.label }));
  const vehicle = selectedId ? vehicles.get(selectedId) : null;
  if (!vehicle) return null;

  const sourceClass = cn(
    'w-2 h-2 rounded-full animate-pulse-slow',
    vehicle.dataSource === 'simulation' ? 'bg-amber-500' : 'bg-green-400',
  );

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      className="fixed top-0 right-0 z-60 h-full w-full md:w-[420px] glass-panel border-l shadow-2xl flex flex-col"
    >
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-inner">
            {vehicle.category.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-semibold">{vehicle.label}</span>
            <span className="text-[10px] text-slate-400">{CAT_LABEL[vehicle.category]}</span>
          </div>
          {vehicle.isEmergency && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-900/30 animate-pulse-slow">EMERGENCY</span>
          )}
        </div>
        <button onClick={() => selectVehicle(null)} className="glass-button p-1.5" aria-label="Close panel">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Live Telemetry</h3>
          <div className="grid gap-3">
            <Row label="Position" value={`${vehicle.position[1].toFixed(6)}°, ${vehicle.position[0].toFixed(6)}°`} />
            <Row label="Altitude" value={`${vehicle.position[2].toFixed(1)} m`} />
            <Row label="Speed" value={`${Math.round(vehicle.speed)} km/h`} />
            <Row label="Heading" value={`${Math.round(vehicle.heading)}°`} />
            <Row label="Route" value={vehicle.routeId ?? '—'} />
            <Row label="Road progress" value={`${Math.round((vehicle.roadProgress ?? 0) * 100)}%`} />
            <Row label="Last update" value={new Date(vehicle.lastUpdate).toLocaleTimeString()} />
            <Row label="Tracking history" value={`${vehicle.trackingHistory.length} points`} />
          </div>
        </section>
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Data Source</h3>
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-800/40 border-slate-700/50">
            <div className={sourceClass} />
            <div>
              <span className="text-sm font-semibold block">{SOURCE_LABEL[vehicle.dataSource]}</span>
              <span className="text-[10px] text-slate-400">
                {vehicle.dataSource === 'simulation'
                  ? 'Road-constrained demonstration data. Not live telemetry.'
                  : 'Authorized real-time feed.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
            <span className="font-bold">{label.toUpperCase()} MODE</span>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg border border-slate-700/50 bg-slate-800/30">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-mono text-cyan-300">{value}</span>
    </div>
  );
}
