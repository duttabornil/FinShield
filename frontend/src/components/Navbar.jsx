import React from 'react';
import { Activity, Shield, Zap, RotateCcw } from 'lucide-react';

export default function Navbar({ currentTab, setTab, onOpenSimulator, onReset, isResetting, alertCount = 0 }) {
  const navItems = [
    ['overview', 'Overview'],
    ['transactions', 'Transactions'],
    ['network', 'Fraud Network'],
    ['alerts', 'Alerts'],
    ['simulator', 'Simulator'],
  ];

  return (
    <header className="fs-topbar">
      <div className="fs-brand" onClick={() => setTab('overview')} role="button" tabIndex={0}>
        <div className="fs-brandmark"><Shield size={18} /></div>
        <div>
          <div className="fs-brandname">FinShield</div>
          <div className="fs-tagline">AI-Powered Financial Fraud Defense Network</div>
        </div>
      </div>

      <nav className="fs-nav" aria-label="Primary navigation">
        {navItems.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={currentTab === id ? 'active' : ''}>
            {label}
            {id === 'alerts' && alertCount > 0 && <span className="fs-nav-badge">{alertCount}</span>}
          </button>
        ))}
      </nav>

      <div className="fs-top-actions">
        <div className="fs-stream-pill"><Activity size={13} /> SYNTHETIC STREAM</div>
        <button className="fs-ghost-btn fs-reset-btn" onClick={onReset} disabled={isResetting} title="Reset synthetic dataset">
          <RotateCcw size={14} className={isResetting ? 'animate-spin' : ''} />
          <span>{isResetting ? 'Resetting' : 'Reset'}</span>
        </button>
        {currentTab !== 'simulator' && (
          <button className="fs-primary-btn" onClick={onOpenSimulator}><Zap size={14} /> Launch Simulator</button>
        )}
      </div>
    </header>
  );
}
