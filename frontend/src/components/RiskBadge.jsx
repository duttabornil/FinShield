import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame } from 'lucide-react';

export default function RiskBadge({ level = 'LOW', score = null, showScore = true, size = 'sm' }) {
  const lvl = (level || 'LOW').toUpperCase();

  const configs = {
    LOW: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]',
      icon: ShieldCheck,
      label: 'LOW',
    },
    MEDIUM: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]',
      icon: AlertTriangle,
      label: 'MEDIUM',
    },
    HIGH: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/35',
      text: 'text-orange-400',
      glow: 'shadow-[0_0_15px_rgba(249,115,22,0.25)]',
      icon: ShieldAlert,
      label: 'HIGH',
    },
    CRITICAL: {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/40',
      text: 'text-rose-400',
      glow: 'shadow-[0_0_18px_rgba(244,63,94,0.35)]',
      icon: Flame,
      label: 'CRITICAL',
    },
  };

  const c = configs[lvl] || configs.LOW;
  const Icon = c.icon;

  const sizeStyles = {
    xs: 'text-xs px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-2 font-medium',
    lg: 'text-base px-4 py-2 gap-2.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono uppercase tracking-wider ${c.bg} ${c.border} ${c.text} ${c.glow} ${sizeStyles[size] || sizeStyles.sm}`}
    >
      <Icon className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
      <span>{c.label}</span>
      {showScore && score !== null && (
        <span className="opacity-90 font-bold border-l border-current/25 pl-1.5">
          {score}/100
        </span>
      )}
    </span>
  );
}
