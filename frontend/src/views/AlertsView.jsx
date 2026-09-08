import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  Flame,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Filter,
  RefreshCw,
  Lock,
  ArrowRight
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { fetchAlerts } from '../api/client';

export default function AlertsView({ onInspectTransaction, onNavigateToNetwork, refreshKey }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [refreshKey]);

  const filteredAlerts = alerts.filter(a => {
    if (filterLevel !== 'ALL' && a.risk_level !== filterLevel) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-white tracking-tight">
              INCIDENT THREAT QUEUE
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/60 font-bold">
              {alerts.length} ALERTS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Prioritized forensic threat stream requiring analyst intervention or automated step-up enforcement
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                filterLevel === lvl
                  ? 'bg-slate-800 text-white border border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-slate-500">
          Showing {filteredAlerts.length} incidents
        </span>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading incident queue...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500 glass-panel rounded-xl">
            No threat alerts found for the selected filter criteria.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.risk_level === 'CRITICAL';
            return (
              <div
                key={alert.id}
                className={`glass-panel p-5 rounded-2xl border transition-all duration-200 ${
                  isCritical
                    ? 'border-rose-500/35 bg-gradient-to-r from-rose-950/15 via-slate-900/60 to-slate-900/40'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <RiskBadge level={alert.risk_level} score={alert.risk_score} size="xs" />
                      <span className="text-xs font-mono font-bold text-white tracking-tight">
                        {alert.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">[{alert.id}]</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                        {alert.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {alert.reason}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                      {alert.account_name && (
                        <span>
                          Account: <strong className="text-slate-200">{alert.account_name}</strong>{' '}
                          <span className="text-slate-500">({alert.account_id})</span>
                        </span>
                      )}
                      {alert.amount && (
                        <span>
                          Volume Flagged:{' '}
                          <strong className="text-rose-400">
                            ₹{alert.amount.toLocaleString('en-IN')}
                          </strong>
                        </span>
                      )}
                      {alert.transaction_id && (
                        <span>
                          Originating Tx:{' '}
                          <strong className="text-cyan-400">{alert.transaction_id}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    {alert.transaction_id && (
                      <button
                        onClick={() => onInspectTransaction(alert.transaction_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Investigate Tx</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigateToNetwork(alert.account_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition flex items-center gap-1.5"
                    >
                      <span>Inspect Graph</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Recommended action footer banner */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center gap-2 text-xs font-mono">
                  <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                  <span className="text-slate-400">Playbook:</span>
                  <span className="text-rose-300 font-semibold">{alert.recommended_action}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
