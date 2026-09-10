import React, { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import {
  ArrowRight,
  CircleDollarSign,
  Crosshair,
  Maximize2,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Share2,
  TriangleAlert,
  X
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { fetchNetwork } from '../api/client';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const ROLE_LABELS = { victim: 'Customer / Victim', mule: 'Mule Account', cashout: 'Cash-out / Terminal', high_risk: 'Fraud-linked Account', regular: 'Normal Account' };
const ROLE_COLORS = { victim: '#6366f1', mule: '#f59e0b', cashout: '#ef4444', high_risk: '#f97316', regular: '#0891b2' };
const formatMoney = value => INR.format(Number(value || 0));
const nodeRole = node => ROLE_LABELS[node.category] || node.type?.replaceAll('_', ' ') || 'Account';
const clusterForNode = (data, id) => (data?.suspicious_clusters || []).find(cluster => cluster.includes(id)) || null;

function hierarchyDepths(nodes, edges) {
  const incoming = new Map(nodes.map(node => [node.data.id, 0]));
  edges.forEach(edge => incoming.set(edge.data.target, (incoming.get(edge.data.target) || 0) + 1));
  const depths = new Map();
  const queue = nodes.filter(node => !incoming.get(node.data.id)).map(node => [node.data.id, 0]);
  while (queue.length) {
    const [id, depth] = queue.shift();
    if (depth <= (depths.get(id) ?? -1)) continue;
    depths.set(id, depth);
    edges.filter(edge => edge.data.source === id).forEach(edge => queue.push([edge.data.target, depth + 1]));
  }
  nodes.forEach(node => { if (!depths.has(node.data.id)) depths.set(node.data.id, 0); });
  return depths;
}

export default function FraudNetworkView({ focusAccountId = null }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mode, setMode] = useState('full');
  const [focusedPath, setFocusedPath] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchNetwork(focusAccountId).then(data => mounted && setGraphData(data)).catch(error => console.error(error)).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [focusAccountId]);

  const graph = useMemo(() => {
    if (!graphData) return null;
    const suspiciousEdges = graphData.edges.filter(edge => edge.data.is_suspicious);
    const visibleEdges = mode === 'high-risk' || mode === 'fraud' ? suspiciousEdges : graphData.edges;
    const visibleIds = new Set(visibleEdges.flatMap(edge => [edge.data.source, edge.data.target]));
    const visibleNodes = graphData.nodes.filter(node => mode === 'full' || visibleIds.has(node.data.id) || node.data.risk_score >= 60);
    const nodeIds = new Set(visibleNodes.map(node => node.data.id));
    const nodes = visibleNodes.map(node => ({ ...node, data: { ...node.data } }));
    const edges = visibleEdges.filter(edge => nodeIds.has(edge.data.source) && nodeIds.has(edge.data.target));
    const clusters = (graphData.suspicious_clusters || []).filter(cluster => cluster.some(id => nodeIds.has(id)));
    const clusterParents = clusters.map((cluster, index) => ({ data: { id: `cluster_${index}`, label: `Suspicious cluster ${String(index + 1).padStart(2, '0')}`, clusterIndex: index } }));
    nodes.forEach(node => { const index = clusters.findIndex(cluster => cluster.includes(node.data.id)); if (index >= 0) node.data.parent = `cluster_${index}`; });
    return { nodes: [...clusterParents, ...nodes], edges, clusterMembers: clusters, depths: hierarchyDepths(nodes, edges) };
  }, [graphData, mode]);

  useEffect(() => {
    if (!containerRef.current || !graph) return undefined;
    cyRef.current?.destroy();
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graph.nodes, ...graph.edges],
      style: [
        { selector: 'node', style: { label: 'data(label)', color: '#cbd5e1', 'font-family': 'ui-monospace, SFMono-Regular, monospace', 'font-size': 10, 'font-weight': 600, 'text-valign': 'bottom', 'text-margin-y': 7, 'background-color': '#164e63', 'border-width': 2, 'border-color': '#22d3ee', width: 34, height: 34, 'overlay-opacity': 0, 'transition-property': 'opacity, border-color, width, height', 'transition-duration': 250 } },
        { selector: 'node[category = "victim"]', style: { shape: 'ellipse', 'background-color': '#3730a3', 'border-color': '#818cf8', 'border-width': 3 } },
        { selector: 'node[category = "mule"]', style: { shape: 'diamond', 'background-color': '#92400e', 'border-color': '#fbbf24', 'border-width': 3 } },
        { selector: 'node[category = "cashout"]', style: { shape: 'rectangle', 'background-color': '#991b1b', 'border-color': '#fb7185', 'border-width': 3, width: 42, height: 42 } },
        { selector: 'node[category = "high_risk"]', style: { shape: 'hexagon', 'background-color': '#9a3412', 'border-color': '#fb923c' } },
        { selector: 'node[category = "regular"]', style: { shape: 'ellipse', 'background-color': '#155e75', 'border-color': '#22d3ee' } },
        { selector: 'node[clusterIndex]', style: { label: 'data(label)', 'background-color': '#0f172a', 'background-opacity': 0.35, 'border-color': '#334155', 'border-style': 'dashed', 'border-width': 1, color: '#64748b', 'font-size': 9, 'text-valign': 'top', 'text-margin-y': 8, padding: 18, 'compound-sizing-wrt-labels': 'include' } },
        { selector: 'node:selected, node.highlighted', style: { 'border-color': '#67e8f9', 'border-width': 4, width: 44, height: 44 } },
        { selector: 'edge', style: { width: 1.5, 'line-color': '#334155', 'target-arrow-color': '#64748b', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'arrow-scale': 0.85, opacity: 0.68, label: 'data(formatted_amount)', color: '#94a3b8', 'font-size': 9, 'text-background-color': '#070b13', 'text-background-opacity': 0.9, 'text-background-padding': 2 } },
        { selector: 'edge[?is_suspicious]', style: { width: 3, 'line-color': '#f43f5e', 'target-arrow-color': '#f43f5e', opacity: 0.95, 'line-style': 'dashed', 'line-dash-pattern': [6, 3], color: '#fda4af' } },
        { selector: '.faded', style: { opacity: 0.12 } },
        { selector: '.path-focus', style: { opacity: 1, width: 4, 'line-color': '#22d3ee', 'target-arrow-color': '#22d3ee', 'line-style': 'solid' } }
      ],
      layout: { name: 'breadthfirst', directed: true, roots: graph.nodes.filter(node => !node.data.parent && !graph.edges.some(edge => edge.data.target === node.data.id)).map(node => node.data.id), spacingFactor: 1.25, padding: 55, animate: false }
    });
    cy.layout({ name: 'breadthfirst', directed: true, roots: graph.nodes.filter(node => !node.data.parent && !graph.edges.some(edge => edge.data.target === node.data.id)).map(node => node.data.id), spacingFactor: 1.25, padding: 55, animate: false }).run();
    cy.resize();
    cy.fit(null, 45);
    cy.on('tap', 'node[!clusterIndex]', event => {
      const node = event.target;
      setSelectedNode(node.data());
      const neighborhood = node.closedNeighborhood();
      cy.elements().removeClass('highlighted faded path-focus');
      cy.elements().difference(neighborhood).addClass('faded');
      neighborhood.addClass('highlighted');
    });
    cy.on('tap', event => { if (event.target === cy) { setSelectedNode(null); cy.elements().removeClass('highlighted faded path-focus'); } });
    cyRef.current = cy;
    return () => cy.destroy();
  }, [graph]);

  const selectedCluster = selectedNode ? clusterForNode(graphData, selectedNode.id) : graphData?.suspicious_clusters?.[0];
  const selectedClusterSet = new Set(selectedCluster || []);
  const clusterEdges = graphData?.edges.filter(edge => selectedClusterSet.has(edge.data.source) && selectedClusterSet.has(edge.data.target)) || [];
  const suspiciousClusterEdges = clusterEdges.filter(edge => edge.data.is_suspicious);
  const highestRisk = selectedCluster ? graphData.nodes.filter(node => selectedClusterSet.has(node.data.id)).sort((a, b) => b.data.risk_score - a.data.risk_score)[0] : null;
  const connectedSuspicious = selectedNode ? graphData?.edges.filter(edge => edge.data.is_suspicious && (edge.data.source === selectedNode.id || edge.data.target === selectedNode.id)).length : 0;

  const resetView = () => { setMode('full'); setFocusedPath(false); setSelectedNode(null); cyRef.current?.elements().removeClass('highlighted faded path-focus'); cyRef.current?.fit(null, 45); };
  const focusSelected = () => {
    if (!selectedNode || !cyRef.current) return;
    const node = cyRef.current.getElementById(selectedNode.id);
    if (!node) return;
    const connected = node.closedNeighborhood();
    cyRef.current.elements().removeClass('faded path-focus');
    cyRef.current.elements().difference(connected).addClass('faded');
    connected.addClass('path-focus');
    cyRef.current.fit(connected, 65);
    setFocusedPath(true);
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#070b13] text-slate-200 animate-fadeIn">
      <div className="border-b border-slate-800/80 bg-[#090d16]/95 px-5 py-3 flex flex-wrap items-center justify-between gap-3 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3"><Share2 className="h-5 w-5 text-cyan-400" /><div><h2 className="text-sm font-bold font-mono uppercase tracking-tight text-white">Financial Fraud Topology</h2><p className="text-[10px] font-mono text-slate-500">Trace the network and money flow behind suspicious activity</p></div></div>
        <div className="flex flex-wrap items-center gap-1.5">{[['full', 'Full Network'], ['fraud', 'Fraud Networks'], ['high-risk', 'High Risk Only']].map(([value, label]) => <button key={value} onClick={() => setMode(value)} className={`px-2.5 py-1.5 rounded-md border text-[11px] font-mono transition ${mode === value ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'}`}>{label}</button>)}<button onClick={() => setMode('full')} className="px-2.5 py-1.5 rounded-md border border-slate-800 bg-slate-900 text-slate-400 text-[11px] font-mono"><CircleDollarSign className="inline h-3.5 w-3.5 mr-1" />Money Flow</button><button onClick={resetView} className="px-2.5 py-1.5 rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:text-white text-[11px] font-mono"><RotateCcw className="inline h-3.5 w-3.5 mr-1" />Reset View</button></div>
      </div>
      <div className="border-b border-slate-800/80 bg-[#0a0f19] px-5 py-2 flex flex-wrap items-center justify-between gap-3 z-10"><div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-slate-400">{Object.entries(ROLE_LABELS).map(([key, label]) => <span key={key} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ROLE_COLORS[key] }} />{label}</span>)}</div><div className="flex items-center gap-1"><button title="Zoom out" onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)} className="p-1.5 border border-slate-800 bg-slate-900 text-slate-400 rounded"><Minus className="h-3.5 w-3.5" /></button><button title="Zoom in" onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)} className="p-1.5 border border-slate-800 bg-slate-900 text-slate-400 rounded"><Plus className="h-3.5 w-3.5" /></button><button title="Fit network" onClick={() => cyRef.current?.fit(null, 45)} className="p-1.5 border border-slate-800 bg-slate-900 text-slate-400 rounded"><Maximize2 className="h-3.5 w-3.5" /></button></div></div>
      <div className="relative flex-1 min-h-0 bg-[radial-gradient(circle_at_50%_20%,rgba(14,116,144,0.09),transparent_48%),linear-gradient(rgba(30,41,59,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.16)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px]"><div ref={containerRef} className="absolute inset-0 h-full w-full" />{loading && <div className="absolute inset-0 flex items-center justify-center bg-[#070b13]/85"><div className="text-center font-mono text-xs text-slate-400"><div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />Rendering network topology...</div></div>}{graphData && <div className="absolute left-4 top-4 w-64 border border-slate-800/90 bg-[#0b111c]/95 p-3 shadow-xl backdrop-blur-md"><div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-400"><Network className="h-3.5 w-3.5 text-cyan-400" />Selected network</div><div className="grid grid-cols-2 gap-2 font-mono"><div><span className="block text-[9px] text-slate-500">NETWORK RISK</span><strong className="text-sm text-rose-300">{highestRisk ? (highestRisk.data.risk_score >= 80 ? 'CRITICAL' : highestRisk.data.risk_score >= 60 ? 'HIGH' : 'MEDIUM') : 'N/A'}</strong></div><div><span className="block text-[9px] text-slate-500">ACCOUNTS</span><strong className="text-sm text-white">{selectedCluster?.length || graphData.stats.total_nodes}</strong></div><div><span className="block text-[9px] text-slate-500">CONNECTIONS</span><strong className="text-sm text-white">{selectedCluster ? clusterEdges.length : graphData.stats.total_edges}</strong></div><div><span className="block text-[9px] text-slate-500">SUSPICIOUS FLOW</span><strong className="text-sm text-rose-300">{formatMoney((selectedCluster ? suspiciousClusterEdges : graphData.edges.filter(edge => edge.data.is_suspicious)).reduce((sum, edge) => sum + edge.data.amount, 0))}</strong></div></div>{highestRisk && <div className="mt-3 border-t border-slate-800 pt-2 text-[10px] font-mono text-slate-500">HIGHEST RISK ACCOUNT <span className="text-slate-200">{highestRisk.data.id}</span></div>}</div>}{selectedNode && <aside className="absolute right-4 top-4 bottom-4 flex w-[min(21rem,calc(100%-2rem))] flex-col overflow-y-auto border border-slate-700/80 bg-[#0b111c]/96 p-4 shadow-2xl backdrop-blur-md animate-slideLeft"><div className="flex items-start justify-between border-b border-slate-800 pb-3"><div><p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Account investigation</p><h3 className="mt-1 text-base font-bold font-mono text-white">{selectedNode.label}</h3><p className="text-xs font-mono text-slate-400">{selectedNode.id}</p></div><button onClick={() => setSelectedNode(null)} className="p-1 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button></div><div className="flex items-center justify-between py-3"><RiskBadge level={selectedNode.risk_score >= 80 ? 'CRITICAL' : selectedNode.risk_score >= 60 ? 'HIGH' : selectedNode.risk_score >= 30 ? 'MEDIUM' : 'LOW'} score={selectedNode.risk_score} size="sm" /><span className="border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-mono uppercase text-slate-300">{nodeRole(selectedNode)}</span></div><div className="space-y-2 font-mono text-xs">{[['Account number', selectedNode.account_number], ['Connected accounts', `${selectedNode.connections || 0}`], ['Suspicious transactions', `${connectedSuspicious}`], ['Money received', formatMoney(selectedNode.total_in)], ['Money forwarded', formatMoney(selectedNode.total_out)]].map(([label, value]) => <div key={label} className="flex items-center justify-between border border-slate-800 bg-slate-900/70 p-2.5"><span className="text-slate-500">{label}</span><strong className="text-slate-100">{value}</strong></div>)}</div><div className="mt-3 border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400"><div className="mb-1 flex items-center gap-1.5 font-bold text-slate-300"><TriangleAlert className="h-3.5 w-3.5 text-amber-400" />Why flagged</div><p>{selectedNode.is_mule ? 'Mule account classification and suspicious network participation.' : selectedNode.risk_score >= 60 ? 'High account risk score and suspicious connected transfers.' : 'No high-risk account signal is present in the available graph data.'}</p></div><button onClick={focusSelected} className="mt-auto flex items-center justify-center gap-2 border border-cyan-800/70 bg-cyan-950/60 px-3 py-2 text-xs font-mono font-semibold text-cyan-300 hover:bg-cyan-900/70"><Crosshair className="h-3.5 w-3.5" />{focusedPath ? 'Focused neighborhood' : 'Focus money-flow path'}</button></aside>}{!loading && graphData && graphData.nodes.length === 0 && <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-slate-500">No network data returned.</div>}<div className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] font-mono text-slate-500"><ArrowRight className="h-3.5 w-3.5 text-cyan-500" />Arrows show transfer direction · labels show transaction amount{graphData?.stats?.suspicious_clusters_detected ? ` · ${graphData.stats.suspicious_clusters_detected} suspicious cluster(s)` : ''}</div></div>
    </div>
  );
}
