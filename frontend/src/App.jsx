import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import InvestigationModal from './components/InvestigationModal';
import DemoGuide from './components/DemoGuide';

import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import FraudNetworkView from './views/FraudNetworkView';
import AlertsView from './views/AlertsView';
import SimulatorView from './views/SimulatorView';

import { fetchDashboard, fetchTransactionById, resetDatabase, triggerSimulation } from './api/client';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [focusAccountId, setFocusAccountId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [demoStep, setDemoStep] = useState(1);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchDashboard();
        if (mounted) setDashboardStats(data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        if (mounted) setLoadingDashboard(false);
      }
    })();
    return () => { mounted = false; };
  }, [refreshKey]);

  const handleInspectTransaction = async (txId) => {
    try { setSelectedTransaction(await fetchTransactionById(txId)); }
    catch (err) { alert(`Could not load transaction: ${err.message}`); }
  };

  const handleNavigateToNetwork = (accountId = null) => {
    setFocusAccountId(accountId);
    setCurrentTab('network');
  };

  const handleReset = async () => {
    if (!window.confirm('Reset synthetic database back to the demo baseline?')) return;
    setIsResetting(true);
    try {
      await resetDatabase();
      setRefreshKey((k) => k + 1);
      setSelectedTransaction(null);
      setFocusAccountId(null);
      setDemoStep(1);
      setCurrentTab('overview');
    } catch (err) { alert(`Failed to reset: ${err.message}`); }
    finally { setIsResetting(false); }
  };

  const handleTriggerDemoStep = async (step) => {
    if (step.tab) setCurrentTab(step.tab);
    if (step.action === 'suspicious') {
      setCurrentTab('simulator');
      try {
        const res = await triggerSimulation('suspicious');
        setRefreshKey((k) => k + 1);
        if (res.transaction) setSelectedTransaction(res.transaction);
      } catch (err) { console.error(err); }
    } else if (step.action === 'show_investigation') {
      try { setSelectedTransaction(await fetchTransactionById('TXN-SIM-0052')); }
      catch {
        if (dashboardStats?.recent_alerts?.[0]?.transaction_id) handleInspectTransaction(dashboardStats.recent_alerts[0].transaction_id);
      }
    } else if (step.action === 'highlight_mule_chain') {
      setCurrentTab('network');
    } else if (step.action === 'fraud_ring') {
      setCurrentTab('simulator');
      try { await triggerSimulation('fraud_ring'); setRefreshKey((k) => k + 1); }
      catch (err) { console.error(err); }
    }
  };

  const setTab = (tab) => { setFocusAccountId(null); setCurrentTab(tab); };

  return (
    <div className="fs-app">
      <Navbar
        currentTab={currentTab}
        setTab={setTab}
        alertCount={dashboardStats?.recent_alerts?.length || 0}
        onOpenSimulator={() => setCurrentTab('simulator')}
        onReset={handleReset}
        isResetting={isResetting}
      />
      <main className="fs-main">
        {currentTab === 'overview' && (
          <DashboardView stats={dashboardStats} loading={loadingDashboard} onNavigate={setTab} onInspectTransaction={handleInspectTransaction} onOpenSimulator={() => setCurrentTab('simulator')} />
        )}
        {currentTab === 'transactions' && <TransactionsView onInspectTransaction={handleInspectTransaction} refreshKey={refreshKey} />}
        {currentTab === 'network' && <FraudNetworkView focusAccountId={focusAccountId} onInspectTransaction={handleInspectTransaction} />}
        {currentTab === 'alerts' && <AlertsView onInspectTransaction={handleInspectTransaction} onNavigateToNetwork={handleNavigateToNetwork} refreshKey={refreshKey} />}
        {currentTab === 'simulator' && <SimulatorView onSimulationSuccess={() => setRefreshKey((k) => k + 1)} onInspectTransaction={handleInspectTransaction} onNavigateToNetwork={handleNavigateToNetwork} />}
      </main>

      {selectedTransaction && (
        <InvestigationModal transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} onNavigateToNetwork={handleNavigateToNetwork} onActionSuccess={(updatedTx) => { setSelectedTransaction(updatedTx); setRefreshKey((k) => k + 1); }} />
      )}

      <DemoGuide currentStep={demoStep} setCurrentStep={setDemoStep} onTriggerDemoStep={handleTriggerDemoStep} />
    </div>
  );
}
