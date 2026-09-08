import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import InvestigationModal from './components/InvestigationModal';
import DemoGuide from './components/DemoGuide';

import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import FraudNetworkView from './views/FraudNetworkView';
import AlertsView from './views/AlertsView';
import SimulatorView from './views/SimulatorView';

import {
  fetchDashboard,
  fetchTransactionById,
  resetDatabase,
  triggerSimulation
} from './api/client';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [focusAccountId, setFocusAccountId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [demoStep, setDemoStep] = useState(1);

  // Load dashboard telemetry
  const loadDashboard = async () => {
    try {
      const data = await fetchDashboard();
      setDashboardStats(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [refreshKey]);

  // Open investigation modal by transaction ID
  const handleInspectTransaction = async (txId) => {
    try {
      const tx = await fetchTransactionById(txId);
      setSelectedTransaction(tx);
    } catch (err) {
      console.error('Failed to fetch transaction for investigation:', err);
      alert(`Could not load transaction: ${err.message}`);
    }
  };

  // Jump to network centered around an account
  const handleNavigateToNetwork = (accountId = null) => {
    setFocusAccountId(accountId);
    setCurrentTab('network');
  };

  // Reset database to initial state
  const handleReset = async () => {
    if (!window.confirm('Reset synthetic database back to default initial state?')) return;
    setIsResetting(true);
    try {
      await resetDatabase();
      setRefreshKey((k) => k + 1);
      setSelectedTransaction(null);
      setFocusAccountId(null);
      setDemoStep(1);
    } catch (err) {
      console.error('Reset error:', err);
      alert(`Failed to reset: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Handle demo step triggers
  const handleTriggerDemoStep = async (step) => {
    if (step.tab) {
      setCurrentTab(step.tab);
    }

    if (step.action === 'suspicious') {
      setCurrentTab('simulator');
      try {
        const res = await triggerSimulation('suspicious');
        setRefreshKey((k) => k + 1);
        if (res.transaction) {
          // Open modal immediately
          setSelectedTransaction(res.transaction);
        }
      } catch (err) {
        console.error(err);
      }
    } else if (step.action === 'show_investigation') {
      // Find the suspicious transaction or open default
      try {
        const tx = await fetchTransactionById('TXN-SIM-0052');
        setSelectedTransaction(tx);
      } catch {
        if (dashboardStats?.recent_alerts?.[0]?.transaction_id) {
          handleInspectTransaction(dashboardStats.recent_alerts[0].transaction_id);
        }
      }
    } else if (step.action === 'highlight_mule_chain') {
      setCurrentTab('network');
    } else if (step.action === 'fraud_ring') {
      setCurrentTab('simulator');
      try {
        await triggerSimulation('fraud_ring');
        setRefreshKey((k) => k + 1);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setTab={(tab) => {
          setFocusAccountId(null);
          setCurrentTab(tab);
        }}
        alertCount={dashboardStats?.recent_alerts?.length || 0}
        onReset={handleReset}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          currentTab={currentTab}
          onOpenSimulator={() => setCurrentTab('simulator')}
        />

        <main className="flex-1 overflow-y-auto bg-[#07090e]">
          {currentTab === 'overview' && (
            <DashboardView
              stats={dashboardStats}
              loading={loadingDashboard}
              onNavigate={(tab) => {
                setFocusAccountId(null);
                setCurrentTab(tab);
              }}
              onInspectTransaction={handleInspectTransaction}
              onOpenSimulator={() => setCurrentTab('simulator')}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              onInspectTransaction={handleInspectTransaction}
              refreshKey={refreshKey}
            />
          )}

          {currentTab === 'network' && (
            <FraudNetworkView
              focusAccountId={focusAccountId}
              onInspectTransaction={handleInspectTransaction}
            />
          )}

          {currentTab === 'alerts' && (
            <AlertsView
              onInspectTransaction={handleInspectTransaction}
              onNavigateToNetwork={handleNavigateToNetwork}
              refreshKey={refreshKey}
            />
          )}

          {currentTab === 'simulator' && (
            <SimulatorView
              onSimulationSuccess={() => setRefreshKey((k) => k + 1)}
              onInspectTransaction={handleInspectTransaction}
              onNavigateToNetwork={handleNavigateToNetwork}
            />
          )}
        </main>
      </div>

      {/* Transaction Investigation Modal */}
      {selectedTransaction && (
        <InvestigationModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onNavigateToNetwork={handleNavigateToNetwork}
          onActionSuccess={(updatedTx) => {
            setSelectedTransaction(updatedTx);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Interactive 3-Minute Demo Presenter Guide */}
      <DemoGuide
        currentStep={demoStep}
        setCurrentStep={setDemoStep}
        onTriggerDemoStep={handleTriggerDemoStep}
      />
    </div>
  );
}
