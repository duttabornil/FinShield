import React from 'react';
import {
  Shield,
  LayoutDashboard,
  ArrowLeftRight,
  Share2,
  BellRing,
  Cpu,
  RefreshCw,
  Terminal,
  Activity
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab, alertCount = 0, onReset, isResetting }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'network', label: 'Fraud Network', icon: Share2 },
    { id: 'alerts', label: 'Alerts', icon: BellRing, badge: alertCount },
    { id: 'simulator', label: 'Simulator', icon: Cpu, highlight: true },
  ];

  return (
    <aside className="w-64 bg-[#090d16] border-r border-slate-800/80 flex flex-col justify-between select-none z-30">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-rose-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-lg text-white tracking-tight font-mono">FINSHIELD</h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-tight">
                Detect. Understand. Expose.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Status Watermark Pill */}
        <div className="mx-4 my-3 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-indigo-300 font-semibold uppercase tracking-wider">
              Simulated Env
            </span>
          </div>
          <span className="text-[9px] font-mono bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/50">
            DEMO
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-900/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge > 0 && (
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    {item.badge}
                  </span>
                )}

                {item.highlight && !isActive && (
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <button
          onClick={onReset}
          disabled={isResetting}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono font-medium text-slate-400 hover:text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition disabled:opacity-50"
          title="Reset synthetic data to baseline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting DB...' : 'Reset Synthetic DB'}</span>
        </button>

        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-900 text-[11px] font-mono text-slate-500 space-y-1">
          <div className="flex justify-between items-center">
            <span>NETWORK STATE</span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ONLINE
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Synthetic banking graph // 0 real customer data
          </p>
        </div>
      </div>
    </aside>
  );
}
