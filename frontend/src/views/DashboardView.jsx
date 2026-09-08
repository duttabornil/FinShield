import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  Flame,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
  Share2,
  Lock,
  ArrowRight
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';

export default function DashboardView({
  stats,
  loading,
  onNavigate,
  onInspectTransaction,
  onOpenSimulator
}) {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Loading simulated financial telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'TOTAL TRANSACTIONS',
      value: stats.total_transactions,
      sub: 'Simulated stream',
      icon: CreditCard,
      color: 'cyan',
      border: 'border-cyan-500/20',
      text: 'text-cyan-400',
      badge: 'MONITORED'
    },
    {
      title: 'HIGH-RISK DETECTIONS',
      value: stats.high_risk_transactions,
      sub: 'Behavioral anomalies',
      icon: ShieldAlert,
      color: 'rose',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      badge: 'ACTION REQ'
    },
    {
      title: 'SUSPICIOUS ACCOUNTS',
      value: stats.suspicious_accounts,
      sub: 'Mule & illicit nodes',
      icon: Users,
      color: 'amber',
      border: 'border-amber-500/25',
      text: 'text-amber-400',
      badge: 'UNDER WATCH'
    },
    {
      title: 'SUSPICIOUS MONEY FLOW',
      value: `₹${(stats.suspicious_money_flow || 0).toLocaleString('en-IN')}`,
      sub: 'Layering volume flagged',
      icon: Flame,
      color: 'indigo',
      border: 'border-indigo-500/30',
      text: 'text-indigo-400',
      badge: 'ISOLATED'
    }
  ];

  const dist = stats.risk_distribution || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const totalInDist = (dist.LOW || 0) + (dist.MEDIUM || 0) + (dist.HIGH || 0) + (dist.CRITICAL || 0) || 1;

  const lowPct = Math.round(((dist.LOW || 0) / totalInDist) * 100);
  const medPct = Math.round(((dist.MEDIUM || 0) / totalInDist) * 100);
  const highPct = Math.round(((dist.HIGH || 0) / totalInDist) * 100);
  const critPct = Math.round(((dist.CRITICAL || 0) / totalInDist) * 100);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Simulation Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-slate-900/60 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-white">
                FINSHIELD AUTONOMOUS DEFENSE ACTIVE
              </span>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/60">
                PROTOTYPE MODE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Zero real bank data // All accounts, topologies and transaction volumes are purely synthetic.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('simulator')}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Open Attack Simulator</span>
          </button>
          <button
            onClick={() => onNavigate('network')}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Inspect Fraud Graph</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`glass-panel p-5 rounded-2xl border ${kpi.border} relative overflow-hidden transition-all duration-200 hover:translate-y-[-2px]`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 ${kpi.text}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-black font-mono text-white tracking-tight">
                  {kpi.value}
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-current/30 ${kpi.text} bg-slate-950/60 font-bold`}>
                  {kpi.badge}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
                <Activity className="w-3 h-3 text-slate-500" />
                <span>{kpi.sub}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Risk Distribution + Active Fraud Networks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                  Risk Tier Distribution
                </h3>
                <p className="text-xs text-slate-400">Behavioral scoring classification</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                {stats.total_transactions} evaluated
              </span>
            </div>

            {/* Segmented bar */}
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-800 mb-6">
              <div style={{ width: `${lowPct}%` }} className="bg-emerald-500 rounded-l-full transition-all duration-500" title={`Low: ${dist.LOW}`} />
              <div style={{ width: `${medPct}%` }} className="bg-amber-500 transition-all duration-500" title={`Medium: ${dist.MEDIUM}`} />
              <div style={{ width: `${highPct}%` }} className="bg-orange-500 transition-all duration-500" title={`High: ${dist.HIGH}`} />
              <div style={{ width: `${critPct}%` }} className="bg-rose-500 rounded-r-full transition-all duration-500" title={`Critical: ${dist.CRITICAL}`} />
            </div>

            {/* Breakdown Items */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">LOW (0 - 29)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{dist.LOW || 0}</span>
                  <span className="text-slate-500 text-[10px]">({lowPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-300">MEDIUM (30 - 59)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{dist.MEDIUM || 0}</span>
                  <span className="text-slate-500 text-[10px]">({medPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-slate-300">HIGH (60 - 79)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{dist.HIGH || 0}</span>
                  <span className="text-slate-500 text-[10px]">({highPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-300">CRITICAL (80 - 100)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{dist.CRITICAL || 0}</span>
                  <span className="text-slate-500 text-[10px]">({critPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('transactions')}
            className="w-full mt-4 py-2 px-3 rounded-lg text-xs font-mono text-cyan-400 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/40 transition flex items-center justify-center gap-1.5"
          >
            <span>View All Evaluated Transactions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Fraud Networks Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                    Active Fraud Networks & Mule Rings
                  </h3>
                  <p className="text-xs text-slate-400">Graph clustering detection engine</p>
                </div>
              </div>

              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 font-bold">
                {stats.active_fraud_networks} NETWORKS DETECTED
              </span>
            </div>

            {/* Primary Ring Highlight Box */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    RING #1: Multi-Hop Synthetic Mule Chain
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800">
                  CRITICAL SEVERITY
                </span>
              </div>

              {/* Topology Path Graphic */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-1 text-[11px] font-mono overflow-x-auto">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                    Victim: Ananya
                  </span>
                  <span className="text-slate-500">➔</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-1 rounded bg-amber-950 text-amber-300 border border-amber-700">
                    Mule A: Rohan
                  </span>
                  <span className="text-slate-500">➔</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-1 rounded bg-amber-950 text-amber-300 border border-amber-700">
                    Mule B: Vikram
                  </span>
                  <span className="text-slate-500">➔</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-1 rounded bg-amber-950 text-amber-300 border border-amber-700">
                    Mule C: Amit
                  </span>
                  <span className="text-slate-500">➔</span>
                </div>
                <div className="shrink-0">
                  <span className="px-2 py-1 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold">
                    Apex Crypto Hub
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Autonomous graph traversal has isolated a 4-tier layering cluster draining victim balances through rapid 3-minute hops before reaching terminal liquidation.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              Algorithm: Directed DFS Cycle & Multi-Hop Traversal
            </span>
            <button
              onClick={() => onNavigate('network')}
              className="px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Inspect Full Topology in Cytoscape</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Alerts Section */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Recent Threat Alerts Stream
              </h3>
              <p className="text-xs text-slate-400">Real-time risk engine triage stream</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('alerts')}
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>View All Alerts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {stats.recent_alerts && stats.recent_alerts.length > 0 ? (
            stats.recent_alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <RiskBadge level={alert.risk_level} score={alert.risk_score} size="xs" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{alert.title}</span>
                      <span className="text-[11px] font-mono text-slate-500">[{alert.id}]</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{alert.reason}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-400">
                      <span>Account: <strong className="text-slate-200">{alert.account_name}</strong></span>
                      {alert.amount && (
                        <span>Amount: <strong className="text-rose-400">₹{alert.amount.toLocaleString('en-IN')}</strong></span>
                      )}
                      <span>Time: {alert.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.transaction_id && (
                    <button
                      onClick={() => onInspectTransaction(alert.transaction_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                    >
                      Investigate
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('network')}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition"
                  >
                    View Graph
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs font-mono text-slate-500">
              No active threat alerts registered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
