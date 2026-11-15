import { useState } from 'react';
import { useMapStore } from '@/store/useMapStore';
import { CAMERA_PRESETS } from '@/store/useMapStore';
import { Globe, Navigation, Plus, AlertCircle, ShieldAlert, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function CameraControls() {
  const { activePreset, flyToPreset, setTopDown, setPerspective } =
    useMapStore((s) => ({
      activePreset: s.activePreset,
      flyToPreset: s.flyToPreset,
      setTopDown: s.setTopDown,
      setPerspective: s.setPerspective,
    }));

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
      <div className="hidden md:flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-2 shadow-xl">
        {CAMERA_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => flyToPreset(p.id)}
            className={cn(
              'glass-button px-3 py-1.5 text-xs flex items-center gap-2 whitespace-nowrap transition-all',
              activePreset === p.id
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                : 'hover:bg-slate-800',
            )}
            aria-label={p.label}
            title={p.description}
          >
            {p.icon === 'Globe' && <Globe className="w-4 h-4" />}
            {p.icon === 'Navigation' && <Navigation className="w-4 h-4" />}
            {p.icon === 'Plus' && <Plus className="w-4 h-4" />}
            {p.icon === 'AlertCircle' && <AlertCircle className="w-4 h-4" />}
            {p.icon === 'ShieldAlert' && <ShieldAlert className="w-4 h-4" />}
            <span className="font-medium">{p.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={setTopDown} className="glass-button px-2 py-1.5 text-xs" title="Top-down">
          ↑
        </button>
        <button onClick={setPerspective} className="glass-button px-2 py-1.5 text-xs" title="Perspective">
          ↱
        </button>
      </div>
      <div className="md:hidden flex flex-col items-end gap-1">
        <button onClick={() => setExpanded(!expanded)} className="glass-button p-2" aria-label="Camera presets">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute bottom-[48px] right-0 w-48 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-2 shadow-xl flex flex-col gap-1"
          >
            {CAMERA_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => { flyToPreset(p.id); setExpanded(false); }}
                className="glass-button text-xs px-2 py-1.5 flex items-center gap-2 w-full justify-start hover:bg-slate-800"
              >
                {p.icon === 'Globe' && <Globe className="w-4 h-4" />}
                {p.icon === 'Navigation' && <Navigation className="w-4 h-4" />}
                {p.icon === 'Plus' && <Plus className="w-4 h-4" />}
                {p.icon === 'AlertCircle' && <AlertCircle className="w-4 h-4" />}
                {p.icon === 'ShieldAlert' && <ShieldAlert className="w-4 h-4" />}
                <span>{p.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
