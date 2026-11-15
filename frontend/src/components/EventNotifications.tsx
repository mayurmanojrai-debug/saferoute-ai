import { useTrafficStore } from '@/store/useTrafficStore';
import { useMapStore } from '@/store/useMapStore';
import { AlertCircle, ShieldAlert, X, Clock } from 'lucide-react';
import { motion } from 'framer-motion';




export default function EventNotifications() {
  const { events, resolveEvent } = useTrafficStore((s) => ({
    events: s.events,
    resolveEvent: s.resolveEvent,
  }));
  const { selectVehicle } = useMapStore((s) => ({ selectVehicle: s.selectVehicle }));

  const active = events.filter((e) => e.status === 'active').slice(0, 6);

  if (active.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-xl p-3 shadow-2xl border border-red-900/30 min-w-[320px] max-w-[420px]"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-red-900/50 flex items-center justify-center text-red-400 border border-red-900/40">
          <AlertCircle className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-red-200">Active Incidents</h3>
      </div>
      <div className="space-y-2">
        {active.map((ev) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-700 bg-slate-800/60"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                ev.severity === 'critical' || ev.severity === 'high'
                  ? 'bg-red-500 animate-pulse-slow'
                  : 'bg-amber-500'
              }`}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="font-semibold text-slate-200 capitalize">{ev.type.replace(/_/g, ' ')}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0 rounded ${
                  ev.severity === 'critical' || ev.severity === 'high'
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-amber-900/30 text-amber-400'
                }`}>
                  {ev.severity.toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 leading-snug">{ev.title}</span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {new Date(ev.reportedAt).toLocaleString()} · {ev.description}
              </span>
            </div>
            <button
              onClick={() => {
                selectVehicle(null);
                resolveEvent(ev.id);
              }}
              className="p-1 text-slate-500 hover:text-slate-200 transition"
              aria-label="Resolve incident"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}


