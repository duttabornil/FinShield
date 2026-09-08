import React from 'react';
import { Shield, Sparkles, Terminal, Activity, Zap } from 'lucide-react';

export default function Navbar({ currentTab, onOpenSimulator }) {
  const titles = {
    overview: { name: 'Ecosystem Overview', sub: 'Real-time telemetry, risk distribution & threat triage' },
    transactions: { name: 'Transaction Stream', sub: 'Granular behavioral audit log of simulated transfers' },
    network: { name: 'Fraud Defense Network Graph', sub: 'Mule chain topology & suspicious clustering engine' },
    alerts: { name: 'Incident Alerts', sub: 'Prioritized forensic threat queue with automated playbooks' },
    simulator: { name: 'Attack Vector Simulator', sub: 'Inject synthetic fraud rings & anomalies live' },
  };

  const current = titles[currentTab] || titles.overview;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white tracking-tight font-mono">{current.name}</h2>
          <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono">/</span>
          <span className="hidden sm:inline-block text-xs text-slate-400 font-sans">{current.sub}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Synthetic Data Indicator Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-slate-300">SYNTHETIC DATASET</span>
          <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/50">
            SIMULATED
          </span>
        </div>

        {/* Quick Simulator Jump */}
        {currentTab !== 'simulator' && (
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-950/40 transition active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Launch Simulator</span>
          </button>
        )}
      </div>
    </header>
  );
}
