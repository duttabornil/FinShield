from typing import List, Dict, Any, Set, Tuple
from collections import defaultdict, deque
from .models import Account, Transaction, NetworkGraph, NetworkNode, NetworkEdge

class GraphEngine:
    """
    FinShield Fraud Network Graph Engine.
    Analyzes transaction topologies, detects mule account chains,
    identifies high-risk clusters, and prepares Cytoscape.js payloads.
    """

    @classmethod
    def build_network(
        cls,
        accounts: Dict[str, Account],
        transactions: List[Transaction],
        focus_account_id: str = None
    ) -> Dict[str, Any]:
        """
        Builds a Cytoscape-compatible graph representation.
        If focus_account_id is provided, extracts the 2-hop neighborhood.
        """
        # Build adjacency for traversal
        adj = defaultdict(list)
        rev_adj = defaultdict(list)
        edge_map = {}

        for tx in transactions:
            adj[tx.sender_id].append(tx)
            rev_adj[tx.receiver_id].append(tx)
            edge_map[tx.id] = tx

        # If focusing on a specific account, filter nodes to 2-hop radius
        allowed_nodes: Set[str] = set()
        if focus_account_id and focus_account_id in accounts:
            allowed_nodes.add(focus_account_id)
            # Hop 1
            hop1 = set()
            for tx in adj[focus_account_id]:
                hop1.add(tx.receiver_id)
            for tx in rev_adj[focus_account_id]:
                hop1.add(tx.sender_id)
            allowed_nodes.update(hop1)
            # Hop 2
            for h1 in hop1:
                for tx in adj[h1]:
                    allowed_nodes.add(tx.receiver_id)
                for tx in rev_adj[h1]:
                    allowed_nodes.add(tx.sender_id)
        else:
            allowed_nodes = set(accounts.keys())

        # Calculate in/out metrics per node
        node_in_vol = defaultdict(float)
        node_out_vol = defaultdict(float)
        node_degree = defaultdict(int)

        for tx in transactions:
            if tx.sender_id in allowed_nodes and tx.receiver_id in allowed_nodes:
                node_out_vol[tx.sender_id] += tx.amount
                node_in_vol[tx.receiver_id] += tx.amount
                node_degree[tx.sender_id] += 1
                node_degree[tx.receiver_id] += 1

        # Format Cytoscape Nodes
        nodes = []
        for acc_id in allowed_nodes:
            acc = accounts.get(acc_id)
            if not acc:
                continue

            # Determine badge/color category
            category = "regular"
            if acc.type in ["CONFIRMED_MULE", "SUSPECTED_MULE"]:
                category = "mule"
            elif acc.type == "CASHOUT_POINT":
                category = "cashout"
            elif acc.type == "VICTIM":
                category = "victim"
            elif acc.risk_score >= 60:
                category = "high_risk"

            nodes.append({
                "data": {
                    "id": acc.id,
                    "label": acc.name,
                    "account_number": acc.account_number,
                    "type": acc.type.value if hasattr(acc.type, "value") else str(acc.type),
                    "category": category,
                    "risk_score": acc.risk_score,
                    "balance": acc.balance,
                    "total_in": round(node_in_vol[acc.id], 2),
                    "total_out": round(node_out_vol[acc.id], 2),
                    "connections": node_degree[acc.id],
                    "is_frozen": acc.is_frozen,
                    "is_mule": acc.type in ["CONFIRMED_MULE", "SUSPECTED_MULE"],
                }
            })

        # Format Cytoscape Edges
        edges = []
        for tx in transactions:
            if tx.sender_id in allowed_nodes and tx.receiver_id in allowed_nodes:
                risk_score = tx.risk_assessment.score if tx.risk_assessment else 10
                is_suspicious = (
                    tx.is_flagged or
                    risk_score >= 60 or
                    tx.scenario_tag in ["mule_chain", "fraud_ring", "suspicious_tx"]
                )

                edges.append({
                    "data": {
                        "id": f"edge_{tx.id}",
                        "source": tx.sender_id,
                        "target": tx.receiver_id,
                        "amount": tx.amount,
                        "formatted_amount": f"₹{tx.amount:,.0f}",
                        "timestamp": tx.timestamp,
                        "risk_score": risk_score,
                        "is_suspicious": is_suspicious,
                        "scenario_tag": tx.scenario_tag or "standard",
                    }
                })

        # Detect Mule Chains
        mule_chains = cls.detect_mule_chains(accounts, transactions)

        # Detect Suspicious Clusters
        suspicious_clusters = cls.detect_suspicious_clusters(accounts, transactions)

        stats = {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "mule_chains_detected": len(mule_chains),
            "suspicious_clusters_detected": len(suspicious_clusters),
            "high_risk_node_count": sum(1 for n in nodes if n["data"]["risk_score"] >= 60),
            "total_flow": round(sum(tx.amount for tx in transactions), 2)
        }

        return {
            "nodes": nodes,
            "edges": edges,
            "mule_chains": mule_chains,
            "suspicious_clusters": suspicious_clusters,
            "stats": stats
        }

    @classmethod
    def detect_mule_chains(
        cls,
        accounts: Dict[str, Account],
        transactions: List[Transaction]
    ) -> List[List[str]]:
        """
        Detects sequential money laundering paths:
        Victim/Source -> Mule 1 -> Mule 2 (-> Mule 3) -> Cash-out
        """
        # Build directed graph from transactions
        graph = defaultdict(list)
        for tx in transactions:
            graph[tx.sender_id].append(tx.receiver_id)

        chains: List[List[str]] = []
        visited_chains: Set[str] = set()

        # Find paths starting at VICTIM or high-balance sources
        start_nodes = [
            acc_id for acc_id, acc in accounts.items()
            if acc.type == "VICTIM" or acc.risk_score >= 40
        ]

        def dfs(curr: str, path: List[str], seen: Set[str]):
            if len(path) >= 3:
                # Check if path contains at least one mule
                has_mule = any(
                    accounts.get(nid) and accounts[nid].type in ["CONFIRMED_MULE", "SUSPECTED_MULE"]
                    for nid in path[1:-1]
                )
                ends_in_cashout_or_mule = (
                    accounts.get(curr) and
                    (accounts[curr].type in ["CASHOUT_POINT", "CONFIRMED_MULE"] or accounts[curr].risk_score >= 70)
                )

                if has_mule and ends_in_cashout_or_mule:
                    key = "->".join(path)
                    if key not in visited_chains:
                        visited_chains.add(key)
                        chains.append(list(path))

            if len(path) >= 6:
                return

            for neighbor in graph[curr]:
                if neighbor not in seen:
                    dfs(neighbor, path + [neighbor], seen | {neighbor})

        for start in start_nodes:
            dfs(start, [start], {start})

        # Sort chains by length descending
        chains.sort(key=len, reverse=True)
        return chains[:5]  # Return top detectable chains

    @classmethod
    def detect_suspicious_clusters(
        cls,
        accounts: Dict[str, Account],
        transactions: List[Transaction]
    ) -> List[List[str]]:
        """
        Finds connected components of accounts linked by high-risk transactions.
        """
        high_risk_adj = defaultdict(set)
        for tx in transactions:
            risk = tx.risk_assessment.score if tx.risk_assessment else 0
            if risk >= 50 or tx.is_flagged or tx.scenario_tag in ["fraud_ring", "mule_chain"]:
                high_risk_adj[tx.sender_id].add(tx.receiver_id)
                high_risk_adj[tx.receiver_id].add(tx.sender_id)

        visited: Set[str] = set()
        clusters: List[List[str]] = []

        for node in high_risk_adj:
            if node not in visited:
                cluster = []
                queue = deque([node])
                visited.add(node)
                while queue:
                    curr = queue.popleft()
                    cluster.append(curr)
                    for neighbor in high_risk_adj[curr]:
                        if neighbor not in visited:
                            visited.add(neighbor)
                            queue.append(neighbor)
                if len(cluster) >= 3:
                    clusters.append(cluster)

        return clusters
