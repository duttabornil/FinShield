import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  Flame,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Terminal,
  ExternalLink,
  Share2,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { triggerSimulation } from '../api/client';

export default function SimulatorView({
  onSimulationSuccess,
  onInspectTransaction,
  onNavigateToNetwork
}) {
  const [loadingScenario, setLoadingScenario] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [simulationLogs, setSimulationLogs] = useState([
    {
      time: new Date().toLocaleTimeString(),
      msg: 'Attack Simulator initialized. Ready to inject synthetic threat vectors.',
      type: 'info'
    }
  ]);

  const scenarios = [
    {
      id: 'normal',
      title: 'Normal Transaction',
      badge: 'BENIGN BASELINE',
      badgeColor: 'emerald',
      description: 'Executes a routine retail transfer (₹1,850) from Ananya Sharma to FreshBazaar Supermarket using a verified iPhone 14 Pro.',
      expectedScore: '15/100 (LOW)',
      icon: ShieldCheck,
      cardBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
      btnColor: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40',
      riskTier: 'LOW'
    },
    {
      id: 'suspicious',
      title: 'Suspicious Transaction',
      badge: '92/100 CRITICAL',
      badgeColor: 'rose',
      description: 'Sudden ₹48,000 transfer (8.3x baseline) to new beneficiary Rohan Verma on unrecognized device at 2:30 AM.',
      expectedScore: '92/100 (CRITICAL)',
      icon: ShieldAlert,
      cardBorder: 'border-rose-500/35 hover:border-rose-500/70',
      btnColor: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50',
      riskTier: 'CRITICAL',
      highlight: true
    },
    {
      id: 'account_takeover',
      title: 'Account Takeover',
      badge: 'CREDENTIAL HIJACK',
      badgeColor: 'orange',
      description: 'Hostile credential rotation and foreign Tor IP access attempting immediate ₹95,000 account balance drainage.',
      expectedScore: '98/100 (CRITICAL)',
      icon: Flame,
      cardBorder: 'border-orange-500/35 hover:border-orange-500/70',
      btnColor: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border-orange-500/50',
      riskTier: 'CRITICAL'
    },
    {
      id: 'fraud_ring',
      title: 'Coordinated Fraud Ring',
      badge: 'MULTI-HOP MULE CHAIN',
      badgeColor: 'rose',
      description: 'Dynamic injection of rapid 4-tier layering ring: Victim ➔ Mule A ➔ Mule B ➔ Mule C ➔ Apex Crypto Terminal Hub.',
      expectedScore: '99/100 (CRITICAL)',
      icon: Zap,
      cardBorder: 'border-rose-500/50 hover:border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
      btnColor: 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold border-rose-500',
      riskTier: 'CRITICAL',
      highlight: true
    }
  ];

  const handleTrigger = async (scenarioId) => {
    setLoadingScenario(scenarioId);
    try {
      const res = await triggerSimulation(scenarioId);
      setActiveResult(res);

      // Add to terminal logs
      setSimulationLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          msg: `Scenario executed: ${res.title}. Status: ${res.status}`,
          type: res.scenario === 'normal' ? 'success' : 'alert'
        },
        {
          time: new Date().toLocaleTimeString(),
          msg: res.message,
          type: 'detail'
        },
        ...prev.slice(0, 15)
      ]);

      if (onSimulationSuccess) {
        onSimulationSuccess(res);
      }
    } catch (err) {
      console.error(err);
      alert(`Simulation error: ${err.message}`);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-white tracking-tight">
              ATTACK VECTOR SIMULATOR
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold">
              LIVE INJECTION SUITE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Trigger simulated financial fraud scenarios to benchmark real-time behavioral defense and graph algorithms
          </p>
        </div>

        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1.5 rounded-lg border border-cyan-800/50">
          SIMULATED / DEMO DATA ONLY
        </span>
      </div>

      {/* Active Result Banner (If a scenario was just triggered) */}
      {activeResult && (
        <div
          className={`p-6 rounded-2xl border transition-all duration-300 animate-slideDown ${
            activeResult.scenario === 'fraud_ring'
              ? 'bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-amber-950/40 border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
              : activeResult.scenario === 'suspicious'
              ? 'bg-gradient-to-r from-rose-950/30 via-slate-900/80 to-slate-900/60 border-rose-500/50'
              : activeResult.scenario === 'account_takeover'
              ? 'bg-gradient-to-r from-orange-950/30 via-slate-900/80 to-slate-900/60 border-orange-500/50'
              : 'bg-emerald-950/30 border-emerald-500/40'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-base font-bold font-mono text-white tracking-wider uppercase">
                  {activeResult.title}
                </h3>
                <span className="text-[10px] font-mono bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {activeResult.status}
                </span>
              </div>

              <p className="text-xs text-slate-200 font-sans leading-relaxed max-w-3xl">
                {activeResult.message}
              </p>

              {/* Specific info for Suspicious Transaction scenario (92/100) */}
              {activeResult.scenario === 'suspicious' && activeResult.transaction && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
                  <span className="text-slate-300">
                    Amount: <strong className="text-rose-400">₹48,000</strong> (Normal: ₹5,800)
                  </span>
                  <span>•</span>
                  <span className="text-slate-300">
                    Risk: <strong className="text-rose-400">92/100 — CRITICAL</strong>
                  </span>
                  <span>•</span>
                  <span className="text-slate-300">
                    Reasons: <strong className="text-slate-200">New Beneficiary, Unusual Amount, New Device, Mule Link</strong>
                  </span>
                </div>
              )}

              {/* Specific info for Coordinated Fraud Ring */}
              {activeResult.scenario === 'fraud_ring' && activeResult.mule_chain && (
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-rose-500/30 text-xs font-mono flex items-center gap-2 overflow-x-auto">
                  <span className="text-rose-400 font-bold shrink-0">Topology Path:</span>
                  <span className="text-slate-300 shrink-0">
                    Ananya (Victim) ➔ Rohan (Mule A) ➔ Vikram (Mule B) ➔ Amit (Mule C) ➔ Apex Crypto Desk
                  </span>
                </div>
              )}
            </div>

            {/* Quick deep link buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {activeResult.transaction && (
                <button
                  onClick={() => onInspectTransaction(activeResult.transaction.id)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-950/50 transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Investigate Transaction</span>
                </button>
              )}

              <button
                onClick={() => onNavigateToNetwork()}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 transition flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Investigate Network</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isLoading = loadingScenario === sc.id;

          return (
            <div
              key={sc.id}
              className={`glass-panel p-5 rounded-2xl border ${sc.cardBorder} flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] relative overflow-hidden`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <RiskBadge level={sc.riskTier} showScore={false} size="xs" />
                </div>

                <h3 className="text-sm font-bold font-mono text-white tracking-tight">
                  {sc.title}
                </h3>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[55px]">
                  {sc.description}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Expected Score:</span>
                  <span className="text-slate-200 font-bold">{sc.expectedScore}</span>
                </div>
              </div>

              <button
                onClick={() => handleTrigger(sc.id)}
                disabled={loadingScenario !== null}
                className={`w-full mt-4 py-2.5 px-3 rounded-xl text-xs font-mono transition flex items-center justify-center gap-2 border ${sc.btnColor} disabled:opacity-50`}
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Executing Scenario...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Trigger Scenario</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Execution Terminal & Telemetry Stream */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 font-bold">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>SIMULATION TELEMETRY & AUDIT LOG</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            AUTO-STREAMING // 0 DELAY
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#06080d] border border-slate-900 font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto">
          {simulationLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-slate-600 text-[10px] shrink-0 mt-0.5">[{log.time}]</span>
              <span
                className={
                  log.type === 'alert'
                    ? 'text-rose-400 font-bold'
                    : log.type === 'success'
                    ? 'text-emerald-400'
                    : log.type === 'detail'
                    ? 'text-slate-400'
                    : 'text-cyan-400'
                }
              >
                {log.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
