import { useTrafficStore } from '@/store/useTrafficStore';
import { useMapStore } from '@/store/useMapStore';
import { CONGESTION_COLORS } from '@/store/useTrafficStore';
import { AlertCircle, ShieldAlert, Clock, X } from 'lucide-react';
import { motion } from 'framer-motion';

type Event = import('@/types').TrafficEvent;

export default function TrafficLegend() {
  const { events, roads } = useTrafficStore((s) => ({ events: s.events, roads: s.roads }));
  const vehicles = useVehiclesStore((s) => s.vehicles);

  const counts = { low: 0, moderate: 0, heavy: 0, severe: 0, unknown: 0 };
  for (const r of roads.values()) counts[r.congestion as any]++;

  return (
    <div className="fixed bottom-6 right-6 z-50 glass-panel rounded-xl p-3 shadow-xl min-w-[200px]">
      <div className="flex items-center gap-2 mb-2 px-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400" />
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
          Traffic Legend
        </span>
      </div>
      <div className="space-y-1.5">
        {(Object.keys(counts) as any[]).map((level) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CONGESTION_COLORS[level as any] }}
            />
            <span className="text-[11px] text-slate-300">{level.toUpperCase()}</span>
            <span className="ml-auto text-[11px] font-mono text-slate-500">
              {counts[level as any]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-slate-700 pt-2">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>Tracked vehicles</span>
          <span className="font-mono text-cyan-300">{vehicles.size}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>Road segments</span>
          <span className="font-mono text-cyan-300">{roads.size}</span>
        </div>
      </div>
    </div>
  );
}
