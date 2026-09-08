import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ShieldAlert,
  Users,
  CreditCard,
  ArrowRight,
  Info,
  X,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { fetchNetwork } from '../api/client';

export default function FraudNetworkView({ focusAccountId = null, onInspectTransaction }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeMuleChainIdx, setActiveMuleChainIdx] = useState(null);
  const [filterSuspiciousOnly, setFilterSuspiciousOnly] = useState(false);

  const loadNetworkData = async () => {
    setLoading(true);
    try {
      const data = await fetchNetwork(focusAccountId);
      setGraphData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworkData();
  }, [focusAccountId]);

  // Initialize Cytoscape when data loads
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Filter elements if toggle active
    let elements = [
      ...graphData.nodes,
      ...graphData.edges
    ];

    if (filterSuspiciousOnly) {
      const suspNodeIds = new Set();
      graphData.edges.forEach(e => {
        if (e.data.is_suspicious) {
          suspNodeIds.add(e.data.source);
          suspNodeIds.add(e.data.target);
        }
      });
      elements = [
        ...graphData.nodes.filter(n => suspNodeIds.has(n.data.id) || n.data.risk_score >= 60),
        ...graphData.edges.filter(e => e.data.is_suspicious)
      ];
    }

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        // Default Node Style
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#cbd5e1',
            'font-family': 'monospace',
            'font-size': '10px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': '#1e293b',
            'border-width': 2,
            'border-color': '#475569',
            'width': 34,
            'height': 34,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '0.3s'
          }
        },
        // Category specific styling
        {
          selector: 'node[category = "regular"]',
          style: {
            'background-color': '#0369a1',
            'border-color': '#38bdf8',
          }
        },
        {
          selector: 'node[category = "victim"]',
          style: {
            'background-color': '#4338ca',
            'border-color': '#818cf8',
            'border-width': 3,
          }
        },
        {
          selector: 'node[category = "mule"]',
          style: {
            'background-color': '#b45309',
            'border-color': '#f59e0b',
            'border-width': 3,
          }
        },
        {
          selector: 'node[category = "cashout"]',
          style: {
            'background-color': '#be123c',
            'border-color': '#f43f5e',
            'border-width': 3,
            'width': 42,
            'height': 42,
          }
        },
        {
          selector: 'node[category = "high_risk"]',
          style: {
            'background-color': '#c2410c',
            'border-color': '#fb923c',
          }
        },
        // Selected / Highlighted Node
        {
          selector: 'node:selected, node.highlighted',
          style: {
            'border-color': '#38bdf8',
            'border-width': 4,
            'shadow-blur': 25,
            'shadow-color': '#38bdf8',
            'shadow-opacity': 0.8,
            'width': 46,
            'height': 46,
          }
        },
        {
          selector: 'node.mule-chain-active',
          style: {
            'border-color': '#f43f5e',
            'border-width': 4,
            'shadow-blur': 30,
            'shadow-color': '#f43f5e',
            'shadow-opacity': 0.9,
          }
        },
        // Default Edge Style
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#334155',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.9,
            'opacity': 0.7,
            'transition-property': 'line-color, width, opacity',
            'transition-duration': '0.3s'
          }
        },
        // Suspicious Edges
        {
          selector: 'edge[?is_suspicious]',
          style: {
            'width': 3,
            'line-color': '#f43f5e',
            'target-arrow-color': '#f43f5e',
            'opacity': 0.95,
            'line-style': 'dashed',
            'line-dash-pattern': [6, 3]
          }
        },
        {
          selector: 'edge.highlighted',
          style: {
            'width': 4,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'opacity': 1,
            'z-index': 999
          }
        },
        {
          selector: 'edge.mule-chain-active',
          style: {
            'width': 4.5,
            'line-color': '#f43f5e',
            'target-arrow-color': '#f43f5e',
            'opacity': 1,
            'line-style': 'solid',
            'z-index': 999
          }
        },
        {
          selector: '.faded',
          style: {
            'opacity': 0.15
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 50,
        componentSpacing: 100,
        nodeOverlap: 20,
        idealEdgeLength: 80,
      }
    });

    // Node click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      setSelectedNode(data);

      // Highlight 1-hop connected neighbors
      cy.elements().removeClass('highlighted faded');
      const neighborhood = node.closedNeighborhood();
      cy.elements().difference(neighborhood).addClass('faded');
      neighborhood.addClass('highlighted');
    });

    // Background click resets highlights
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.elements().removeClass('highlighted faded mule-chain-active');
        setActiveMuleChainIdx(null);
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [graphData, filterSuspiciousOnly]);

  // Layout switcher
  const runLayout = (name) => {
    if (!cyRef.current) return;
    cyRef.current.layout({
      name: name,
      animate: true,
      animationDuration: 500,
      padding: 50,
    }).run();
  };

  // Zoom controls
  const handleZoomIn = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current && cyRef.current.fit(null, 40);

  // Highlight specific detected mule chain
  const highlightMuleChain = (chain, idx) => {
    if (!cyRef.current) return;
    setActiveMuleChainIdx(idx);

    const cy = cyRef.current;
    cy.elements().removeClass('highlighted faded mule-chain-active');

    // Collect chain nodes & edges
    const chainSet = new Set(chain);
    const chainNodes = cy.nodes().filter(n => chainSet.has(n.id()));

    const chainEdges = cy.edges().filter(e => {
      const s = e.data('source');
      const t = e.data('target');
      for (let i = 0; i < chain.length - 1; i++) {
        if (chain[i] === s && chain[i + 1] === t) return true;
      }
      return false;
    });

    const activeSub = chainNodes.union(chainEdges);
    cy.elements().difference(activeSub).addClass('faded');
    activeSub.addClass('mule-chain-active');

    // Fit view to the highlighted chain
    cy.fit(activeSub, 60);

    // Select first node to show detail
    if (chain.length > 0) {
      const firstNode = cy.getElementById(chain[0]);
      if (firstNode) setSelectedNode(firstNode.data());
    }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden animate-fadeIn">
      {/* Control Ribbon */}
      <div className="bg-[#090d16]/90 border-b border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono text-white tracking-tight uppercase">
              Financial Fraud Topology
            </h2>
          </div>

          {graphData && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 border-l border-slate-800 pl-3">
              <span>{graphData.stats.total_nodes} Accounts</span>
              <span>•</span>
              <span>{graphData.stats.total_edges} Transfers</span>
              <span>•</span>
              <span className="text-rose-400 font-bold">{graphData.stats.mule_chains_detected} Mule Chains</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-slate-300">Victim</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">Mule Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">Terminal Cash-Out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-300">Normal / Merchant</span>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            onClick={() => setFilterSuspiciousOnly(!filterSuspiciousOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              filterSuspiciousOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {filterSuspiciousOnly ? 'Showing Suspicious Only' : 'Filter High-Risk'}
          </button>

          {/* Layout buttons */}
          <button
            onClick={() => runLayout('cose')}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono"
            title="Force-Directed Cose Layout"
          >
            Organic
          </button>
          <button
            onClick={() => runLayout('concentric')}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono"
            title="Concentric Circles Layout"
          >
            Concentric
          </button>
          <button
            onClick={() => runLayout('breadthfirst')}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono"
            title="Flow Hierarchy Layout"
          >
            Flow
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Zoom & Fit */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mule Chain Quick Selection Bar */}
      {graphData && graphData.mule_chains && graphData.mule_chains.length > 0 && (
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-6 py-2 flex items-center gap-3 overflow-x-auto z-10">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            Detected Mule Chains:
          </span>
          {graphData.mule_chains.map((chain, idx) => (
            <button
              key={idx}
              onClick={() => highlightMuleChain(chain, idx)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium shrink-0 transition flex items-center gap-1.5 border ${
                activeMuleChainIdx === idx
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-sm shadow-rose-950/50'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>Chain #{idx + 1} ({chain.length} hops)</span>
              <ArrowRight className="w-3 h-3 text-rose-400" />
            </button>
          ))}

          {activeMuleChainIdx !== null && (
            <button
              onClick={() => {
                setActiveMuleChainIdx(null);
                if (cyRef.current) {
                  cyRef.current.elements().removeClass('highlighted faded mule-chain-active');
                  cyRef.current.fit(null, 40);
                }
              }}
              className="text-[11px] font-mono text-cyan-400 hover:underline shrink-0 ml-2"
            >
              Clear Highlight
            </button>
          )}
        </div>
      )}

      {/* Main Cytoscape Graph Canvas */}
      <div className="relative flex-1 bg-[#07090e]">
        <div ref={containerRef} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 font-mono text-xs text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>Rendering Fraud Network Topology...</span>
            </div>
          </div>
        )}

        {/* Node Inspector Side Drawer (When a node is clicked) */}
        {selectedNode && (
          <div className="absolute right-4 top-4 bottom-4 w-80 bg-[#0b0f19]/95 border border-slate-700/80 rounded-2xl shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-20 backdrop-blur-md animate-slideLeft">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    ACCOUNT INSPECTOR
                  </div>
                  <h3 className="text-base font-bold font-mono text-white mt-0.5">
                    {selectedNode.label}
                  </h3>
                  <div className="text-xs font-mono text-slate-400">
                    {selectedNode.id}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Risk Badge & Category */}
              <div className="flex items-center justify-between">
                <RiskBadge
                  level={selectedNode.risk_score >= 80 ? 'CRITICAL' : selectedNode.risk_score >= 60 ? 'HIGH' : selectedNode.risk_score >= 30 ? 'MEDIUM' : 'LOW'}
                  score={selectedNode.risk_score}
                  size="sm"
                />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase border border-slate-700 font-bold">
                  {selectedNode.type}
                </span>
              </div>

              {/* Financial Metrics */}
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">CURRENT BALANCE:</span>
                  <span className="text-white font-bold">
                    ₹{(selectedNode.balance || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">INCOMING FLOW:</span>
                  <span className="text-emerald-400 font-bold">
                    ₹{(selectedNode.total_in || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">OUTGOING DRAIN:</span>
                  <span className="text-rose-400 font-bold">
                    ₹{(selectedNode.total_out || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">CONNECTED EDGES:</span>
                  <span className="text-cyan-400 font-bold">
                    {selectedNode.connections || 0} links
                  </span>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>BEHAVIORAL PROFILE</span>
                </div>
                <p className="text-slate-400 font-sans leading-relaxed">
                  {selectedNode.is_mule
                    ? 'Identified as active layering conduit with high in/out velocity ratios.'
                    : selectedNode.category === 'victim'
                    ? 'Legitimate high-balance source exhibiting anomalous sudden drainage.'
                    : selectedNode.category === 'cashout'
                    ? 'High-risk exit node (cryptocurrency OTC desk or unmonitored ATM cluster).'
                    : 'Standard participant account exhibiting routine retail activity.'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={() => {
                  if (cyRef.current) {
                    const node = cyRef.current.getElementById(selectedNode.id);
                    if (node) {
                      const neighbors = node.closedNeighborhood();
                      cyRef.current.fit(neighbors, 60);
                    }
                  }
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-mono font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition text-center"
              >
                Center & Zoom Neighborhood
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
