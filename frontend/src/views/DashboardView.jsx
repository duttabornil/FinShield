import React from 'react';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign, Network, ShieldAlert, Users, Zap } from 'lucide-react';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function MetricCard({ label, value, meta, tone = 'primary', icon: Icon }) {
  return (
    <article className="fs-card fs-metric-card">
      <div className="fs-card-label"><span>{label}</span><span className={`fs-status-chip ${tone}`}>{Icon && <Icon size={12} />} {meta}</span></div>
      <div className={`fs-metric-value ${tone}`}>{value}</div>
      <div className="fs-metric-foot">Synthetic simulator telemetry</div>
    </article>
  );
}

export default function DashboardView({ stats, loading, onNavigate, onInspectTransaction, onOpenSimulator }) {
  if (loading || !stats) {
    return <div className="fs-loading"><div className="fs-spinner"/><span>Loading synthetic risk telemetry…</span></div>;
  }

  const dist = stats.risk_distribution || {};
  const total = Math.max(1, Object.values(dist).reduce((a, b) => a + b, 0));
  const tiers = [
    ['LOW', 0, 29, 'low'], ['MEDIUM', 30, 59, 'medium'], ['HIGH', 60, 79, 'high'], ['CRITICAL', 80, 100, 'critical']
  ];
  const recent = stats.recent_alerts || [];
  const metrics = stats.model_performance;

  return (
    <div className="fs-page">
      <section className="fs-page-head">
        <div>
          <div className="fs-title-row"><h1>Ecosystem Overview</h1><span className="fs-demo-pill"><span/> SYNTHETIC ATTACK SIMULATOR</span></div>
          <p>Prototype telemetry, risk distribution, model evidence and threat triage.</p>
        </div>
        <div className="fs-head-actions">
          <button className="fs-ghost-btn" onClick={() => onNavigate('network')}><Network size={15}/> Inspect Fraud Graph</button>
          <button className="fs-primary-btn" onClick={onOpenSimulator}><Zap size={15}/> Launch Simulator</button>
        </div>
      </section>

      <section className="fs-system-banner">
        <div className="fs-live-dot"><span/><span/></div>
        <div className="fs-system-copy"><strong>FINSHIELD DEFENSE PIPELINE ACTIVE</strong><span>Behavioral scoring + graph analysis + explainable alerts are running on synthetic demo records.</span></div>
        <div className="fs-system-note"><CheckCircle2 size={14}/> BENCHMARK MODEL / SYNTHETIC CONTEXT</div>
      </section>

      <section className="fs-metric-grid">
        <MetricCard label="TOTAL TRANSACTIONS" value={stats.total_transactions} meta="Monitored" tone="primary" icon={Activity}/>
        <MetricCard label="HIGH-RISK DETECTIONS" value={stats.high_risk_transactions} meta="Action Required" tone="critical" icon={ShieldAlert}/>
        <MetricCard label="SUSPICIOUS ACCOUNTS" value={stats.suspicious_accounts} meta="Under Watch" tone="secondary" icon={Users}/>
        <MetricCard label="SUSPICIOUS MONEY FLOW" value={INR.format(stats.suspicious_money_flow || 0)} meta="Flagged" tone="primary" icon={CircleDollarSign}/>
      </section>

      <section className="fs-intel-grid">
        <article className="fs-card fs-risk-panel">
          <div className="fs-card-head"><div><h2>Risk Tier Distribution</h2><p>Prototype rule-based classification</p></div><span className="fs-mono-badge">0–100 SCORE</span></div>
          <div className="fs-risk-bar">
            {tiers.map(([name,,, cls]) => <span key={name} className={cls} style={{ width: `${((dist[name] || 0) / total) * 100}%` }}/>) }
          </div>
          <div className="fs-risk-scale"><span>0 LOW</span><span>30 MED</span><span>60 HIGH</span><span>80 CRIT 100</span></div>
          <div className="fs-tier-table">
            {tiers.map(([name, min, max, cls]) => {
              const count = dist[name] || 0; const pct = Math.round((count / total) * 100);
              return <div className="fs-tier-row" key={name}><div><i className={cls}/><span>{name.charAt(0) + name.slice(1).toLowerCase()} ({min}–{max})</span></div><div><span>{count} tx</span><strong>{pct}%</strong></div></div>;
            })}
          </div>
          <div className="fs-panel-foot">Scoring uses transparent prototype rules; it is not a validated banking risk model.</div>
        </article>

        <article className="fs-card fs-network-panel">
          <div className="fs-card-head"><div><h2>Active Fraud Networks & Mule Rings</h2><p>Graph-based suspicious connection analysis</p></div><span className="fs-status-chip critical">{stats.active_fraud_networks} detected</span></div>
          <div className="fs-ring-card">
            <div className="fs-ring-top"><span><b className="fs-pulse-dot"/> Synthetic mule-chain demo</span><em>CRITICAL PATH</em></div>
            <div className="fs-path">
              <span className="victim">Victim</span><b>→</b><span className="mule">Mule A</span><b>→</b><span className="mule">Mule B</span><b>→</b><span className="mule">Mule C</span><b>→</b><span className="cashout">Cash-out</span>
            </div>
            <p>FinShield links risky transfers into a multi-hop network so investigators can see how suspicious funds propagate instead of reviewing isolated payments.</p>
          </div>
          <div className="fs-network-stats"><div><span>Nodes under watch</span><strong>{stats.suspicious_accounts}</strong></div><div><span>Flagged flow</span><strong>{INR.format(stats.suspicious_money_flow || 0)}</strong></div><div><span>Graph mode</span><strong>2-hop + chain</strong></div></div>
          <button className="fs-primary-btn fs-wide-btn" onClick={() => onNavigate('network')}><Network size={15}/> Inspect Full Fraud Topology</button>
        </article>
      </section>

      <section className="fs-card fs-model-panel">
        <div className="fs-card-head"><div><h2>Benchmark Model Performance</h2><p>Measured on the supplied anonymized credit-card dataset using a chronological 80/20 split.</p></div><span className="fs-mono-badge">LOGISTIC REGRESSION</span></div>
        {metrics ? (
          <div className="fs-model-grid">
            {[
              ['Precision', metrics.precision],
              ['Recall', metrics.recall],
              ['F1', metrics.f1],
              ['PR-AUC', metrics.pr_auc]
            ].map(([label, value]) => <div className="fs-model-stat" key={label}><span>{label}</span><strong>{Number(value).toFixed(3)}</strong></div>)}
          </div>
        ) : <div className="fs-empty">Model metrics are unavailable until `python ml/train.py` has completed.</div>}
        <div className="fs-panel-foot">Benchmark features are anonymized and do not contain account relationships. Synthetic simulator events are not scored by this model unless benchmark features are supplied.</div>
      </section>

      <section className="fs-card fs-alert-panel">
        <div className="fs-card-head"><div><h2>Recent Threat Alerts</h2><p>Explainable triage generated from the current synthetic dataset</p></div><button className="fs-text-btn" onClick={() => onNavigate('alerts')}>View all alerts <ArrowRight size={14}/></button></div>
        <div className="fs-alert-list">
          {recent.length === 0 && <div className="fs-empty">No active alerts in the current baseline.</div>}
          {recent.slice(0, 5).map((alert, idx) => (
            <button className="fs-alert-row" key={alert.id || idx} onClick={() => alert.transaction_id && onInspectTransaction(alert.transaction_id)}>
              <div className="fs-alert-icon"><AlertTriangle size={16}/></div>
              <div className="fs-alert-copy"><strong>{alert.title || 'Risk alert'}</strong><span>{alert.message || alert.description || 'Suspicious behavior detected by the prototype risk engine.'}</span></div>
              <span className="fs-alert-action">Investigate <ArrowRight size={13}/></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
