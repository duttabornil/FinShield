// FinShield API Client
const API_BASE = '/api';

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchTransactions({ search = '', risk_level = 'ALL', status = 'ALL', limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (risk_level && risk_level !== 'ALL') params.append('risk_level', risk_level);
  if (status && status !== 'ALL') params.append('status', status);
  if (limit) params.append('limit', limit);

  const res = await fetch(`${API_BASE}/transactions?${params.toString()}`);
  if (!res.ok) throw new Error(`Transactions fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchTransactionById(id) {
  const res = await fetch(`${API_BASE}/transactions/${id}`);
  if (!res.ok) throw new Error(`Transaction ${id} fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchNetwork(accountId = null) {
  const url = accountId ? `${API_BASE}/network/${accountId}` : `${API_BASE}/network`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Network graph fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error(`Alerts fetch failed: ${res.statusText}`);
  return res.json();
}

export async function triggerSimulation(scenario) {
  const res = await fetch(`${API_BASE}/simulate/${scenario}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Simulation failed: ${res.statusText}`);
  return res.json();
}

export async function executeTransactionAction(id, action, notes = '') {
  const res = await fetch(`${API_BASE}/transactions/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, notes })
  });
  if (!res.ok) throw new Error(`Action failed: ${res.statusText}`);
  return res.json();
}

export async function resetDatabase() {
  const res = await fetch(`${API_BASE}/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Reset failed: ${res.statusText}`);
  return res.json();
}
