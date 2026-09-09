# FINSHIELD
### AI-Powered Financial Fraud Defense Network
> **Tagline**: *“Detect. Understand. Expose.”*

[![Hackathon MVP](https://img.shields.io/badge/Prototype-20--Hour%20Hackathon%20MVP-cyan)](#)
[![Stack](https://img.shields.io/badge/Stack-React%20%2B%20FastAPI%20%2B%20Cytoscape.js-indigo)](#)
[![Data](https://img.shields.io/badge/Data-100%25%20Synthetic-emerald)](#)
[![API Keys](https://img.shields.io/badge/External%20Keys-Zero%20Required-rose)](#)

---

## 1. Problem Statement

Financial fraud in the digital banking and instant payment era has evolved beyond isolated stolen cards. Modern fraud operations are carried out by **organized syndicates** utilizing:
- **Account Takeover (ATO)** via credential stuffing and session hijacking.
- **Mule Networks**: Layering stolen funds through chains of compromised or recruited accounts within minutes.
- **Rapid Terminal Liquidation**: Routing money into unmonitored cryptocurrency OTC desks and physical ATM networks before traditional batch AML audits flag them.

Conventional fraud systems suffer from **siloed transaction rules** that fail to spot multi-hop laundering topologies and produce black-box flags that overwhelm fraud analysts.

---

## 2. Solution: FinShield

**FinShield** provides a real-time, explainable fraud defense network that bridges individual behavioral risk scoring with multi-hop graph topology analysis.

### Core Defense Flow
$$\text{Transaction} \longrightarrow \text{Behavioral Risk Analysis} \longrightarrow \text{Risk Score (0--100)} \longrightarrow \text{Fraud Network Traversal} \longrightarrow \text{Explainable Forensic Alert} \longrightarrow \text{Pause / Verify / Proceed}$$

1. **Detect**: Evaluates telemetry (amounts, devices, beneficiaries, velocity, timing, and network proximity) in under 20ms.
2. **Understand**: Synthesizes human-readable forensic audit narratives explaining *why* the transfer was flagged against historical baselines.
3. **Expose**: Employs interactive graph algorithms to illuminate entire mule chains ($\text{Victim} \to \text{Mule}_A \to \text{Mule}_B \to \text{Mule}_C \to \text{Cashout}$).

---

## 3. Key Features

### 1. Command Dashboard
- High-level KPIs: Total Transactions, High-Risk Detections, Suspicious Accounts, Suspicious Money Flow (₹).
- Risk tier distribution bar (Low, Medium, High, Critical).
- Active Fraud Networks card with direct graph deep links.
- Real-time Threat Alerts feed with quick-action triage.

### 2. Searchable Transaction Stream
- High-density audit table filterable by text, risk tier (Low to Critical), and status.
- One-click inspection of any simulated transaction.

### 3. Deep Transaction Investigation
- Dynamic radial **Risk Score Gauge (0–100)** with tiered risk badges.
- **Normal vs. Current Comparison**: Current amount vs. 30-day baseline (e.g. ₹48,000 vs. ₹5,800 average), New Beneficiary (`YES/NO`), New Device (`YES/NO`).
- Granular factor point breakdown (+25 Unusual Amount, +20 New Beneficiary, etc.).
- **Explainable AI Narrative**: Deterministic forensic rationale generated from actual signals.
- **Defense Action Controls**: `[PAUSE TRANSACTION]`, `[STEP-UP VERIFY]`, `[PROCEED / APPROVE]`, `[FREEZE ACCOUNT]`.

### 4. Interactive Fraud Network Graph (Cytoscape.js)
- Visual graph canvas: Accounts as color-coded nodes, directed transactions as weighted edges.
- Node categorization: Victim (Indigo), Mule (Amber), Cash-Out Hub (Crimson), High Risk (Orange), Regular (Sky).
- **Mule Chain Highlighting**: Automatic one-click tracing of $\text{Victim} \to \text{Mule}_A \to \text{Mule}_B \to \text{Mule}_C \to \text{Cashout}$.
- **Node Inspector Drawer**: Live balance, inbound volume, outbound drain, and active connection degree.
- Layout engine switching: Organic (cose), Concentric, Flow (Breadthfirst).

### 5. Prioritized Threat Queue (Alerts)
- Severity-sorted incident queue (Critical, High, Medium, Low).
- Pre-packaged response playbooks.

### 6. Attack Vector Simulator
- **Normal Transaction**: Low-risk retail baseline.
- **Suspicious Transaction**: Intercepts a ₹48,000 transfer (8.3x baseline) with an exact **92/100** risk score.
- **Account Takeover (ATO)**: Simulates foreign Tor IP access and sudden liquidity drainage.
- **Coordinated Fraud Ring**: Dynamically injects a 4-hop mule ring, displays `“COORDINATED FRAUD PATTERN DETECTED”`, updates graph topology, and triggers alerts.

### 7. Integrated 3-Minute Hackathon Demo Guide
- A built-in floating presenter helper widget with 8 step-by-step clicks and speaker talking points.

---

## 4. Tech Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide React Icons.
- **Graph Visualization**: Cytoscape.js with force-directed physics and dynamic neighborhood highlighting.
- **Backend**: Python 3.14, FastAPI, Uvicorn (ASGI), Pydantic v2.
- **Risk & Graph Engines**: Pure Python modular algorithmic scoring and bounded DFS traversal.
- **AI Explanation Layer**: Deterministic template engine (zero external API keys required; optional Gemini/OpenAI hooks supported).
- **Data Layer**: In-memory synthetic banking store with live reset capabilities.

---

## 5. Risk Engine Scoring Formula

Located in `backend/app/risk_engine.py`:

$$\text{Risk Score} = \min\left(100, \sum \text{Weights}\right)$$

| Signal Factor | Penalty Weight | Criteria |
| :--- | :---: | :--- |
| **New Beneficiary** | `+20` | Beneficiary not in sender's trusted list. |
| **New Device** | `+15` | Unrecognized hardware fingerprint. |
| **Unusual Amount** | `+25` | Amount $\ge 2.5\times$ historical baseline average. |
| **Unusual Timing** | `+10` | Off-peak execution window (01:00 to 05:00 hrs). |
| **High Velocity** | `+15` | Rapid burst transfers ($\ge 2$ in 10 minutes). |
| **Suspicious Network** | `+30` | Direct edge to known mule or high-risk node ($\ge 65$). |

### Risk Tiers
- **`0 – 29` LOW**: Benign. Routine processing.
- **`30 – 59` MEDIUM**: Soft monitor. Analyst review queue.
- **`60 – 79` HIGH**: High probability. Mandatory biometric/OTP step-up challenge.
- **`80 – 100` CRITICAL**: Acute threat. Instant pause and downstream route quarantine.

---

## 6. Graph Analysis Engine

Located in `backend/app/graph_engine.py`:
- Detects sequential multi-hop laundering chains:
  $$\text{Victim Account} \xrightarrow{\Delta t < 5\text{m}} \text{Mule } A \xrightarrow{\Delta t < 5\text{m}} \text{Mule } B \xrightarrow{\Delta t < 5\text{m}} \text{Mule } C \xrightarrow{\text{Terminal}} \text{Crypto OTC / ATM}$$
- Computes account in/out velocity ratios to identify layering conduits.
- Isolates connected high-risk subgraphs within 2-hop neighborhoods.

---

## 7. Setup & Running Locally

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ and npm

### 1. Clone & Backend Setup
```bash
# Navigate to project directory
cd FinShield

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Run backend API server (runs on http://127.0.0.1:8000)
python backend/run.py
```

### 2. Frontend Setup
```bash
# In a new terminal window:
cd FinShield/frontend

# Install frontend dependencies
npm.cmd install

# Start Vite dev server (runs on http://localhost:5173)
npm.cmd run dev
```

Open your browser at **`http://localhost:5173`**.

---



## 8. Future Scope

- **Graph Neural Networks (GNNs)**: Implement PyTorch Geometric / GraphSAGE models for dynamic representation learning on subgraphs.
- **Biometric Device Telemetry**: Incorporate behavioral biometrics (keystroke dynamics, swipe angles).
- **Federated Consortium Defense**: Zero-knowledge cross-bank mule intelligence sharing without revealing customer PII.
- **Automated ISO 20022 Interceptor**: Native middleware hooks for real-time ISO 20022 `pacs.008` message enrichment.

---

## 9. Disclaimer

> **HACKATHON PROTOTYPE NOTICE**:  
> FinShield is a hackathon proof-of-concept created strictly for demonstration purposes. **All account names, transaction amounts, device fingerprints, and financial data used in this application are 100% synthetic and computer-generated.** This software does not connect to real bank accounts, UPI rails, or live payment gateways, and makes no claim of production readiness or regulatory compliance.

## Integrated Hackathon UI

This build keeps the original React + FastAPI behavior and applies the supplied Stitch-inspired enterprise fintech presentation layer to the app shell and overview dashboard. All overview metrics remain API-driven from the synthetic backend; no hard-coded production claims were introduced.

The interface intentionally labels the environment as synthetic/demo-only. Risk scores are prototype explainable rules and are not presented as a validated banking model.
