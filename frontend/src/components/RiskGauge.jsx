import React from 'react';

export default function RiskGauge({ score = 0, level = 'LOW', size = 180 }) {
  const cleanScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  // Circumference for a 260 degree arc
  const arcLength = (260 / 360) * (2 * Math.PI * normalizedRadius);
  const strokeDashoffset = arcLength - (cleanScore / 100) * arcLength;

  const getColor = (s) => {
    if (s >= 80) return { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', text: 'text-rose-400', label: 'CRITICAL' };
    if (s >= 60) return { stroke: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', text: 'text-orange-400', label: 'HIGH' };
    if (s >= 30) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', text: 'text-amber-400', label: 'MEDIUM' };
    return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', text: 'text-emerald-400', label: 'LOW' };
  };

  const currentTheme = getColor(cleanScore);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg
        height={size}
        width={size}
        viewBox="0 0 160 160"
        className="transform rotate-[140deg] overflow-visible"
      >
        {/* Background track */}
        <circle
          stroke="#1e293b"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${2 * Math.PI * normalizedRadius}`}
          style={{ strokeDashoffset: 0 }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx="80"
          cy="80"
        />
        {/* Active progress arc */}
        <circle
          stroke={currentTheme.stroke}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${2 * Math.PI * normalizedRadius}`}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
            filter: `drop-shadow(0 0 8px ${currentTheme.glow})`,
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx="80"
          cy="80"
        />
      </svg>

      {/* Center score readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
        <span className="text-4xl font-black font-mono tracking-tight text-white drop-shadow-md">
          {cleanScore}
        </span>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest -mt-1">
          / 100
        </span>
        <span
          className={`mt-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-current/30 ${currentTheme.text}`}
          style={{ backgroundColor: `${currentTheme.stroke}15` }}
        >
          {currentTheme.label} RISK
        </span>
      </div>
    </div>
  );
}
