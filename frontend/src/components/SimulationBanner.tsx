import { useSimulationStore } from '@/store/useSimulationStore';
import { AlertTriangle, Play, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SimulationBanner() {
  const { enabled, label, toggle } = useSimulationStore((s) => ({
    enabled: s.enabled,
    label: s.label,
    toggle: s.toggle,
    start: s.start,
    stop: s.stop,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full border text-xs font-medium flex items-center gap-2 ${
        enabled
          ? 'bg-amber-900/80 border-amber-500/50 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
          : 'bg-slate-900/80 border-slate-700 text-slate-300'
      }`}
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span className="font-bold">{label} MODE</span>
      <span className="mx-1 text-slate-500">·</span>
      <span>
        Road-constrained {'simulation'} data — not live telemetry
      </span>
      <div className="ml-3 flex items-center gap-1">
        <button
          onClick={toggle}
          className="px-2 py-0.5 rounded hover:bg-white/10 transition"
          aria-label={enabled ? 'Stop simulation' : 'Start simulation'}
          title={enabled ? 'Stop simulation' : 'Start simulation'}
        >
          {enabled ? <Play className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
        </button>
      </div>
    </motion.div>
  );
}

