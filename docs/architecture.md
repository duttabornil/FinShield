# FinShield Technical Architecture

> **AI-Powered Financial Fraud Defense Network**  
> Tagline: *“Detect. Understand. Expose.”*

---

## 1. System Overview

FinShield is designed as a modular, responsive fraud defense console built for real-time behavioral anomaly scoring and transaction network analysis using synthetic data.

```
                  +----------------------------------------------+
                  |            FINSHIELD WEB CONSOLE             |
                  |     (React 19 + Vite 8 + Tailwind CSS)       |
                  +----------------------+-----------------------+
                                         |
                       REST API Calls / Vite Proxy (/api)
                                         |
                                         v
                  +----------------------------------------------+
                  |               FASTAPI BACKEND                |
                  |             (Python 3.14 / ASGI)             |
                  +-------+--------------+---------------+-------+
                          |              |               |
             +------------v---+   +------v--------+   +--v------------+
             |  RISK ENGINE   |   | GRAPH ENGINE  |   | EXPLANATION   |
             | (Rule Scoring) |   | (Cytoscape/   |   | ENGINE        |
             |                |   |  Mule DFS)    |   | (Forensic AI) |
             +------------+---+   +------+--------+   +--+------------+
                          |              |               |
                          +--------------+---------------+
                                         |
                                         v
                         +-------------------------------+
                         |     IN-MEMORY STATE STORE     |
                         |   (Accounts, Txs, Alerts)     |
                         +-------------------------------+
```

---

## 2. Risk Engine (`risk_engine.py`)

The prototype scoring engine evaluates 6 distinct behavioral signals. Each signal adds calibrated penalty points toward a maximum cap of `100`:

| Signal Name | Weight | Trigger Condition |
| :--- | :--- | :--- |
| **New Beneficiary** | `+20` | Recipient ID is not present in sender's trusted beneficiary whitelist. |
| **New Device** | `+15` | Originating hardware fingerprint has never been authenticated by account. |
| **Unusual Amount** | `+25` | Amount is $\ge 2.5\times$ historical average transfer baseline. |
| **Unusual Timing** | `+10` | Off-peak transfer initiated between `01:00` and `05:00` local time. |
| **High Velocity** | `+15` | $\ge 2$ transfers originated within a rolling 10-minute window. |
| **Suspicious Network** | `+30` | Direct edge to a suspected/confirmed mule or account with risk score $\ge 65$. |

### Risk Tiers & Enforcement Thresholds

$$\text{Final Score} = \min\left(100, \sum \text{Weights}\right)$$

- **`0 – 29` LOW**: Transaction approved. Within expected behavioral baseline.
- **`30 – 59` MEDIUM**: Flagged for soft monitoring. Queued in analyst triage queue.
- **`60 – 79` HIGH**: Step-up verification required. Out-of-band biometric/OTP challenge.
- **`80 – 100` CRITICAL**: Immediate intervention. Automated transaction pause and route quarantine.

---

## 3. Fraud Network Graph Engine (`graph_engine.py`)

The graph engine constructs a directed graph $G = (V, E)$ where:
- **Vertices $V$**: Bank and fintech accounts (Victims, Mules, Merchants, Normal users, Cash-out points).
- **Edges $E$**: Directed transactions with timestamps, amounts, and individual risk weights.

### Mule Chain Detection Algorithm

To identify multi-hop laundering topologies (e.g., $\text{Victim} \to \text{Mule}_A \to \text{Mule}_B \to \text{Mule}_C \to \text{Cashout}$), the engine runs a bounded depth-first search (DFS):

1. **Seed Selection**: Search begins at accounts classified as `VICTIM` or with an anomalous balance drain.
2. **Path Traversal**: Traverses outgoing transaction edges up to depth $k = 6$.
3. **Chain Qualification**: A path is classified as an active mule chain if:
   - Length $\ge 3$ nodes.
   - At least one intermediate node is tagged as `CONFIRMED_MULE` or `SUSPECTED_MULE`.
   - The terminal node is a `CASHOUT_POINT` (e.g., crypto exchange gateway, ATM hub) or high-risk accumulator.

---

## 4. AI Forensic Explanation Layer (`explanation_engine.py`)

- **Zero-Key Deterministic Synthesis**: Translates raw signal metrics (e.g., amount ratio $8.3\times$, new device fingerprint, off-hours timing) into an institutional audit summary without requiring external API access.
- **Auditable Traceability**: Every sentence maps directly to an evaluated Boolean feature in the risk engine.

---

## 5. Attack Simulator (`simulator.py`)

Provides four deterministic simulation triggers:
1. **Normal Transaction**: Low-risk merchant payment baseline.
2. **Suspicious Transaction**: Intercepts a ₹48,000 anomaly with a **92/100** score.
3. **Account Takeover**: Simulates foreign device/IP credential rotation and balance liquidation.
4. **Coordinated Fraud Ring**: Dynamically injects a 4-hop mule chain, triggers a `“COORDINATED FRAUD PATTERN DETECTED”` alert, and expands the Cytoscape graph in real time.
