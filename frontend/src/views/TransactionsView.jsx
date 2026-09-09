import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Smartphone,
  Calendar,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { fetchTransactions } from '../api/client';

export default function TransactionsView({ onInspectTransaction, refreshKey }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions({
        search,
        risk_level: riskFilter,
        status: statusFilter,
        limit: 100
      });
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [search, riskFilter, statusFilter, refreshKey]);

  const getStatusBadge = (status) => {
    const s = (status || 'PROCESSED').toUpperCase();
    const map = {
      PROCESSED: 'bg-slate-800 text-slate-300 border-slate-700',
      APPROVED: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
      PAUSED: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
      VERIFICATION_REQUIRED: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60',
      FLAGGED: 'bg-orange-950/70 text-orange-300 border-orange-800/60',
      BLOCKED: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
    };
    return (
      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${map[s] || map.PROCESSED}`}>
        {s.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-white tracking-tight">
              TRANSACTION AUDIT STREAM
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {transactions.length} RECORDS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time behavioral scoring feed with step-up verification triggers
          </p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by TxID, sender, recipient, device..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">ALL TIERS</option>
              <option value="CRITICAL">CRITICAL (80+)</option>
              <option value="HIGH">HIGH (60-79)</option>
              <option value="MEDIUM">MEDIUM (30-59)</option>
              <option value="LOW">LOW (0-29)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="PROCESSED">PROCESSED</option>
              <option value="PAUSED">PAUSED</option>
              <option value="FLAGGED">FLAGGED</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="APPROVED">APPROVED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="p-3.5 pl-5">Tx ID</th>
                <th className="p-3.5">Sender</th>
                <th className="p-3.5">Receiver</th>
                <th className="p-3.5 text-right">Amount (INR)</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Device Fingerprint</th>
                <th className="p-3.5 text-center">Risk Score</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500">
                    No transactions match current filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const score = tx.risk_assessment?.score ?? 15;
                  const level = tx.risk_assessment?.level ?? 'LOW';
                  const isSuspicious = score >= 60 || tx.is_flagged;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => onInspectTransaction(tx.id)}
                      className={`cursor-pointer transition-colors ${
                        isSuspicious
                          ? 'bg-rose-950/10 hover:bg-rose-950/25'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <td className="p-3.5 pl-5 font-bold text-slate-200">
                        <div className="flex items-center gap-1.5">
                          {isSuspicious && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          )}
                          <span>{tx.id}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-300 font-sans">
                        <div className="font-semibold font-mono text-slate-200">{tx.sender_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.sender_id}</div>
                      </td>

                      <td className="p-3.5 text-slate-300 font-sans">
                        <div className="font-semibold font-mono text-slate-200">{tx.receiver_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.receiver_id}</div>
                      </td>

                      <td className="p-3.5 text-right font-bold text-white font-mono">
                        <span className={score >= 60 ? 'text-rose-400' : 'text-slate-200'}>
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                        {tx.timestamp}
                      </td>

                      <td className="p-3.5 text-slate-300 max-w-[180px] truncate text-[11px]">
                        <span title={tx.device}>{tx.device}</span>
                      </td>

                      <td className="p-3.5 text-center">
                        <RiskBadge level={level} score={score} size="xs" />
                      </td>

                      <td className="p-3.5 text-center">
                        {getStatusBadge(tx.status)}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectTransaction(tx.id);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 text-cyan-400 border border-slate-700 hover:border-cyan-700 text-[11px] transition inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
