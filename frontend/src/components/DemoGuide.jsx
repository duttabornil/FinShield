import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Play,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

export default function DemoGuide({
  currentStep,
  setCurrentStep,
  onTriggerDemoStep
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = [
    {
      num: 1,
      title: '1. Dashboard Overview',
      tab: 'overview',
      talk: 'Show ecosystem metrics, risk distribution, and autonomous defense posture with simulated data.'
    },
    {
      num: 2,
      title: '2. Open Simulator',
      tab: 'simulator',
      talk: 'Open Attack Vector Simulator ready to trigger real-time behavioral anomalies.'
    },
    {
      num: 3,
      title: '3. Trigger Suspicious Tx',
      action: 'suspicious',
      talk: 'Inject ₹48,000 transfer from Ananya to new beneficiary Rohan on unfamiliar device at 2:30 AM.'
    },
    {
      num: 4,
      title: '4. Show 92/100 Risk & Reasons',
      action: 'show_investigation',
      talk: 'Inspect transaction: 92/100 CRITICAL score, baseline comparison (₹48k vs ₹5.8k), 4 risk reasons.'
    },
    {
      num: 5,
      title: '5. Investigate Network',
      tab: 'network',
      talk: 'Switch to Cytoscape topology: visualize Victim Ananya connected to suspected mule Rohan.'
    },
    {
      num: 6,
      title: '6. Show Mule Chain Flow',
      action: 'highlight_mule_chain',
      talk: 'Highlight 4-hop chain: Victim Ananya ➔ Mule Rohan ➔ Mule Vikram ➔ Mule Amit ➔ Apex Crypto Hub.'
    },
    {
      num: 7,
      title: '7. Coordinated Fraud Ring',
      action: 'fraud_ring',
      talk: 'Trigger live Coordinated Fraud Ring: updates scores, expands network, and generates critical alert.'
    },
    {
      num: 8,
      title: '8. Explainable Defense Action',
      tab: 'alerts',
      talk: 'Show generated forensic AI narrative explanation and automated Pause / Step-Up verification.'
    }
  ];

  const handleStepClick = (step) => {
    setCurrentStep(step.num);
    if (onTriggerDemoStep) {
      onTriggerDemoStep(step);
    }
  };

  return (
    <div className="fixed bottom-3 right-6 z-40 max-w-lg transition-all duration-300 select-none">
      {/* Collapsed Pill */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 shadow-xl shadow-indigo-950/50 backdrop-blur-md hover:bg-indigo-900 transition active:scale-95 text-xs font-mono font-bold"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>3-Min Hackathon Demo Guide</span>
          <span className="text-[10px] bg-indigo-900 text-indigo-200 px-1.5 py-0.5 rounded-full border border-indigo-700">
            Step {currentStep}/8
          </span>
          <ChevronUp className="w-4 h-4" />
        </button>
      ) : (
        /* Expanded Walkthrough Card */
        <div className="bg-[#0b0f19]/95 border border-indigo-500/40 rounded-2xl shadow-2xl p-4 backdrop-blur-md w-96 max-h-[70vh] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  3-Minute Demo Pitch Flow
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {steps.map((s) => {
                const isActive = currentStep === s.num;
                const isPassed = currentStep > s.num;

                return (
                  <button
                    key={s.num}
                    onClick={() => handleStepClick(s)}
                    className={`w-full text-left p-2 rounded-xl text-xs font-mono transition flex items-start gap-2.5 border ${
                      isActive
                        ? 'bg-indigo-950/80 text-white border-indigo-500/60 shadow-sm'
                        : isPassed
                        ? 'bg-slate-900/40 text-slate-400 border-transparent hover:bg-slate-900'
                        : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isActive ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 flex items-center justify-center text-[9px] font-bold text-black">
                          {s.num}
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-500">
                          {s.num}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className={`font-bold ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>
                        {s.title}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-sans leading-tight">
                        {s.talk}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Click any step to jump</span>
            <button
              onClick={() => {
                const next = Math.min(8, currentStep + 1);
                handleStepClick(steps[next - 1]);
              }}
              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 text-[11px]"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
