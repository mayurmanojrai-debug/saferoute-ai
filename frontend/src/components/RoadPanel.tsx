import { useMapStore } from '@/store/useMapStore';
import { useTrafficStore } from '@/store/useTrafficStore';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

type Road = import('@/types').RoadSegment;

const TYPE_LABEL: Record<string, string> = {
  motorway: 'Motorway',
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
  residential: 'Residential',
  service: 'Service',
  unclassified: 'Unclassified',
};

const SIGNAL_LABEL: Record<string, string> = {
  red: 'RED',
  yellow: 'YELLOW',
  green: 'GREEN',
  unknown: 'Unknown',
};

export default function RoadPanel() {
  const { selectedRoadId, selectRoad } = useMapStore((s) => ({
    selectedRoadId: s.selectedRoadId,
    selectRoad: s.selectRoad,
  }));
  const roads = useTrafficStore((s) => s.roads);

  const road = selectedRoadId ? roads.get(selectedRoadId) : null;

  if (!road) return null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed bottom-0 left-0 right-0 z-60 h-[45%] md:h-[35%] glass-panel border-t shadow-2xl flex flex-col"
    >
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-900/40 flex items-center justify-center text-cyan-300 font-bold text-sm border border-cyan-900/30">
            🛣
          </div>
          <div>
            <span className="text-sm font-semibold">{road.name}</span>
            <span className="text-[10px] text-slate-400">
              {TYPE_LABEL[road.type] ?? road.type} road
            </span>
          </div>
        </div>
        <button onClick={() => selectRoad(null)} className="glass-button p-1.5" aria-label="Close panel">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Congestion" value={road.congestion.toUpperCase()} color={road.congestion} />
          <StatCard label="Vehicle count" value={road.vehicleCount} />
          <StatCard label="Avg speed" value={`${road.avgSpeed} km/h`} />
          <StatCard label="Flow" value={`${road.flowDirection}°`} />
        </section>

        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Signal Status
          </h3>
          <div className="p-3 rounded-lg border bg-slate-800/40 border-slate-700/50">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  road.signalStatus === 'red'
                    ? 'bg-red-500 animate-pulse-slow'
                    : road.signalStatus === 'yellow'
                    ? 'bg-amber-500'
                    : road.signalStatus === 'green'
                    ? 'bg-green-500'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-sm font-semibold">{SIGNAL_LABEL[road.signalStatus ?? 'unknown']}</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Geometry
          </h3>
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Vertex count</span>
              <span className="text-slate-200">{road.coordinates.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Bounds (lon/lat)</span>
              <span className="text-slate-200 text-[10px]">{road.coordinates[0]?.join(', ')}</span>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    low: '#22c55e',
    moderate: '#eab308',
    heavy: '#f59e0b',
    severe: '#ef4444',
    unknown: '#64748b',
  };
  return (
    <div className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
      <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-sm font-semibold text-slate-100">{value}</span>
      </div>
      {color && (
        <div className="w-full h-1 mt-2 rounded-full bg-slate-700">
          <div
            className="h-full rounded-full"
            style={{ backgroundColor: colors[color] ?? colors.unknown, width: '100%' }}
          />
        </div>
      )}
    </div>
  );
}
