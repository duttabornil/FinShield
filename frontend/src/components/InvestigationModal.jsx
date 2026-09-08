import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  ShieldAlert,
  ArrowRight,
  Smartphone,
  Calendar,
  CreditCard,
  User,
  Share2,
  Sparkles,
  Lock,
  RotateCcw
} from 'lucide-react';
import RiskBadge from './RiskBadge';
import RiskGauge from './RiskGauge';
import { executeTransactionAction } from '../api/client';

export default function InvestigationModal({ transaction, onClose, onNavigateToNetwork, onActionSuccess }) {
  if (!transaction) return null;

  const [loadingAction, setLoadingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [currentStatus, setCurrentStatus] = useState(transaction.status);

  const assessment = transaction.risk_assessment || {
    score: 15,
    level: 'LOW',
    reasons: ['Standard behavioral baseline'],
    factors: [],
    recommended_action: 'PROCEED - Normal transaction',
    normal_avg_amount: 5800.0,
    is_new_beneficiary: false,
    is_new_device: false,
    ai_narrative: 'Normal transaction within historical baseline parameters.'
  };

  const normalAvg = assessment.normal_avg_amount || 5800;
  const ratio = (transaction.amount / normalAvg).toFixed(1);

  const handleAction = async (actionType) => {
    setLoadingAction(true);
    try {
      const updated = await executeTransactionAction(transaction.id, actionType);
      setCurrentStatus(updated.status);
      setActionSuccessMsg(`Action executed: Transaction status updated to ${updated.status}`);
      if (onActionSuccess) onActionSuccess(updated);
    } catch (err) {
      console.error(err);
      alert(`Action failed: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-mono tracking-tight">
                  TRANSACTION INVESTIGATION
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {transaction.id}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60">
                  SIMULATED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed behavioral anomaly scoring, forensic baseline & defense controls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Action Success Toast if any */}
          {actionSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Top Section: Gauge + Key Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Risk Gauge Card */}
            <div className="glass-panel p-5 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
              <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-2 font-semibold">
                Behavioral Risk Assessment
              </span>
              <RiskGauge score={assessment.score} level={assessment.level} size={170} />
              <div className="mt-3 flex items-center gap-2">
                <RiskBadge level={assessment.level} score={assessment.score} size="sm" />
                <span className="text-xs font-mono text-slate-400">
                  Status: <strong className="text-white">{currentStatus}</strong>
                </span>
              </div>
            </div>

            {/* Normal Baseline Comparison Card */}
            <div className="glass-panel p-5 rounded-xl md:col-span-2 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono uppercase text-slate-300 font-bold tracking-wider">
                    Normal vs. Current Comparison
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/40">
                  HISTORICAL VARIANCE
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Current Amount</div>
                  <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                    ₹{transaction.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] font-mono text-rose-400/90 mt-0.5">
                    {ratio}x of normal
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Normal Average</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    ₹{normalAvg.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    30-day baseline
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">New Beneficiary</div>
                  <div className={`text-lg font-bold font-mono mt-1 ${assessment.is_new_beneficiary ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {assessment.is_new_beneficiary ? 'YES (+20 pts)' : 'NO (Verified)'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Recipient relationship
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">New Device</div>
                  <div className={`text-lg font-bold font-mono mt-1 ${assessment.is_new_device ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {assessment.is_new_device ? 'YES (+15 pts)' : 'NO (Known)'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Hardware fingerprint
                  </div>
                </div>
              </div>

              {/* Sender -> Receiver route row */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 font-medium">{transaction.sender_name}</span>
                  <span className="text-slate-500">({transaction.sender_id})</span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 font-medium">{transaction.receiver_name}</span>
                  <span className="text-slate-500">({transaction.receiver_id})</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Forensic Explanation Narrative */}
          <div className="glass-panel p-5 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-slate-900/30 to-cyan-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-mono uppercase text-cyan-300 font-bold tracking-wider">
                AI Forensic Explanation (Explainable Signal Layer)
              </h4>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/50">
                ZERO-KEY DETERMINISTIC AUDIT
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans bg-slate-950/50 p-3.5 rounded-lg border border-slate-800/70">
              "{assessment.ai_narrative}"
            </p>
          </div>

          {/* Triggered Risk Reasons & Factor Weights */}
          <div className="glass-panel p-5 rounded-xl">
            <h4 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-3">
              Triggered Behavioral Risk Reasons ({assessment.reasons.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {assessment.factors && assessment.factors.length > 0 ? (
                assessment.factors.map((f, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-200 font-mono">{f.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{f.description}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/40 shrink-0 ml-2">
                      +{f.score_impact} pts
                    </span>
                  </div>
                ))
              ) : (
                assessment.reasons.map((r, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Telemetry Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">DEVICE FINGERPRINT</span>
                <span className="text-slate-200 truncate">{transaction.device}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">EXECUTION TIMESTAMP</span>
                <span className="text-slate-200">{transaction.timestamp}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">NETWORK TOPOLOGY</span>
                <span className="text-cyan-400">Linked to Mule Graph</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToNetwork) onNavigateToNetwork(transaction.receiver_id);
                }}
                className="px-2 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900 transition flex items-center gap-1 text-[11px]"
              >
                <Share2 className="w-3 h-3" />
                <span>Inspect Graph</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer with Action Buttons: Pause / Verify / Proceed / Freeze */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Recommended Action:</span>
            <strong className="text-rose-400">{assessment.recommended_action}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('PAUSE')}
              disabled={loadingAction}
              className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <PauseCircle className="w-4 h-4" />
              <span>PAUSE TRANSACTION</span>
            </button>

            <button
              onClick={() => handleAction('VERIFY')}
              disabled={loadingAction}
              className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Smartphone className="w-4 h-4" />
              <span>STEP-UP VERIFY</span>
            </button>

            <button
              onClick={() => handleAction('PROCEED')}
              disabled={loadingAction}
              className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>PROCEED / APPROVE</span>
            </button>

            <button
              onClick={() => handleAction('FREEZE')}
              disabled={loadingAction}
              className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>FREEZE ACCOUNT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
