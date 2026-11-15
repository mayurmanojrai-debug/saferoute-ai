import { useEffect, useState } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useMapStore } from '@/store/useMapStore';
import { ShieldAlert, RefreshCw, Maximize, Menu, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Toolbar() {
  const { enabled, label, vehicleCount, start, stop } =
    useSimulationStore((s) => ({
      enabled: s.enabled,
      label: s.label,
      vehicleCount: s.vehicleCount,
      start: s.start,
      stop: s.stop,
    }));
  const { resetCamera } = useMapStore((s) => ({ resetCamera: s.resetCamera }));

  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const unsub = (window as any).__sr_wsStatus?.subscribe?.(setWsConnected);
    return () => unsub?.();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 py-1.5">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button className="glass-button p-2 hidden md:block" aria-label="Toggle sidebar">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-bold text-xs shadow-lg">
            SA
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-widest text-cyan-300">SAFEROUTE AI</span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase">Smart City Digital Twin</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 border-l border-slate-700 pl-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase">
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse-slow' : 'bg-slate-600'}`} />
            <span className={wsConnected ? 'text-cyan-400' : 'text-slate-500'}>
              {wsConnected ? 'LIVE FEED' : 'OFFLINE'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase">
            <span className={enabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600/20 text-slate-500'}>
              {label}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">{vehicleCount} vehicles</span>
          </div>
        </div>
      </motion.div>
      <div className="flex items-center gap-2">
        <button onClick={resetCamera} className="glass-button" aria-label="Reset camera" title="Reset camera">
          <RefreshCw className="w-4 h-4" /> Reset
        </button>
        <button className="glass-button" aria-label="Top-down view" title="Top-down view">
          <Camera className="w-4 h-4" /> Top-down
        </button>
        <button className="glass-button" aria-label="Fullscreen" title="Fullscreen">
          <Maximize className="w-4 h-4" />
        </button>
        {enabled ? (
          <button onClick={stop} className="glass-button danger" aria-label="Stop simulation" title="Stop simulation">
            <ShieldAlert className="w-4 h-4" /> Stop Simulation
          </button>
        ) : (
          <button onClick={() => start(vehicleCount)} className="glass-button success" aria-label="Start simulation" title="Start simulation">
            <ShieldAlert className="w-4 h-4" /> Start Simulation
          </button>
        )}
      </div>
    </header>
  );
}
