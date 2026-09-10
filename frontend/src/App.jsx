import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import InvestigationModal from './components/InvestigationModal';

import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import FraudNetworkView from './views/FraudNetworkView';
import AlertsView from './views/AlertsView';
import SimulatorView from './views/SimulatorView';

import { fetchDashboard, fetchTransactionById, resetDatabase } from './api/client';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [focusAccountId, setFocusAccountId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

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
      setCurrentTab('overview');
    } catch (err) { alert(`Failed to reset: ${err.message}`); }
    finally { setIsResetting(false); }
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

    </div>
  );
}
