from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any

from .models import (
    DashboardStats,
    Transaction,
    Account,
    Alert,
    NetworkGraph,
    AnalyzeRequest,
    RiskAssessment,
    ActionRequest,
    SimulationResponse,
    TransactionStatus
)
from .database import db
from .risk_engine import RiskEngine
from .graph_engine import GraphEngine
from .simulator import AttackSimulator

app = FastAPI(
    title="FinShield API",
    description="AI-Powered Financial Fraud Defense Network - Prototype Backend",
    version="1.0.0"
)

# Enable permissive CORS for development and demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "app": "FinShield",
        "tagline": "Detect. Understand. Expose.",
        "status": "ONLINE",
        "environment": "SYNTHETIC_HACKATHON_PROTOTYPE",
        "docs_url": "/docs"
    }

@app.get("/api/dashboard", response_model=DashboardStats)
def get_dashboard():
    """Returns top-level KPIs, risk distribution, and recent alerts."""
    return db.get_dashboard_stats()

@app.get("/api/transactions", response_model=List[Transaction])
def get_transactions(
    search: Optional[str] = Query(None, description="Search term for ID, sender, receiver, device"),
    risk_level: Optional[str] = Query(None, description="Filter by risk tier: LOW, MEDIUM, HIGH, CRITICAL"),
    status: Optional[str] = Query(None, description="Filter by status: PROCESSED, PAUSED, FLAGGED, BLOCKED"),
    limit: int = Query(100, ge=1, le=200)
):
    """Search and filter simulated transactions."""
    return db.get_transactions(search=search, risk_level=risk_level, status=status, limit=limit)

@app.get("/api/transactions/{transaction_id}", response_model=Transaction)
def get_transaction_by_id(transaction_id: str):
    """Fetches full forensic details and risk assessment for a specific transaction."""
    tx = db.get_transaction(transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction '{transaction_id}' not found.")
    return tx

@app.post("/api/analyze", response_model=RiskAssessment)
def analyze_transaction(req: AnalyzeRequest):
    """Performs real-time behavioral risk scoring on any arbitrary transaction parameters."""
    sender = db.get_account(req.sender_id)
    if not sender:
        raise HTTPException(status_code=404, detail=f"Sender account '{req.sender_id}' not found.")
    
    receiver = db.get_account(req.receiver_id)
    if not receiver:
        raise HTTPException(status_code=404, detail=f"Receiver account '{req.receiver_id}' not found.")

    assessment = RiskEngine.evaluate(
        sender=sender,
        receiver=receiver,
        amount=req.amount,
        device=req.device,
        timestamp_str=req.timestamp,
        recent_tx_count=1,
        receiver_network_risk=receiver.risk_score >= 60
    )
    return assessment

@app.get("/api/network", response_model=Dict[str, Any])
def get_full_network():
    """Returns the complete Cytoscape-formatted graph with mule chains and clusters."""
    return GraphEngine.build_network(db.accounts, db.transactions)

@app.get("/api/network/{account_id}", response_model=Dict[str, Any])
def get_account_subgraph(account_id: str):
    """Returns the 2-hop neighborhood network centered around a specific account."""
    if account_id not in db.accounts:
        raise HTTPException(status_code=404, detail=f"Account '{account_id}' not found in network.")
    return GraphEngine.build_network(db.accounts, db.transactions, focus_account_id=account_id)

@app.get("/api/alerts", response_model=List[Alert])
def get_alerts():
    """Returns all active and resolved fraud defense alerts."""
    return db.alerts

@app.post("/api/simulate/{scenario}", response_model=SimulationResponse)
def run_simulation(scenario: str):
    """
    Triggers an interactive attack simulation scenario:
    - normal: Standard routine transaction
    - suspicious: ₹48,000 anomaly with 92/100 risk score
    - account_takeover: Credential rotation + high velocity drain
    - fraud_ring: Coordinated multi-hop mule layering
    """
    valid_scenarios = ["normal", "suspicious", "account_takeover", "fraud_ring"]
    if scenario.lower() not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{scenario}'. Valid options: {valid_scenarios}"
        )
    return AttackSimulator.trigger(scenario.lower())

@app.post("/api/transactions/{transaction_id}/action", response_model=Transaction)
def perform_transaction_action(transaction_id: str, action_req: ActionRequest):
    """
    Performs defense interventions:
    - PAUSE: Holds funds temporarily
    - VERIFY: Requires biometric/OTP verification
    - PROCEED: Clears flags and marks transaction APPROVED
    - FREEZE: Blocks transaction and freezes the sender account
    """
    tx = db.get_transaction(transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction '{transaction_id}' not found.")

    action_map = {
        "PAUSE": TransactionStatus.PAUSED,
        "VERIFY": TransactionStatus.VERIFICATION_REQUIRED,
        "PROCEED": TransactionStatus.APPROVED,
        "FREEZE": TransactionStatus.BLOCKED,
        "APPROVE": TransactionStatus.APPROVED,
        "BLOCK": TransactionStatus.BLOCKED,
    }

    action_upper = action_req.action.upper()
    if action_upper not in action_map:
        raise HTTPException(status_code=400, detail=f"Unsupported action '{action_req.action}'.")

    target_status = action_map[action_upper]
    updated_tx = db.update_transaction_status(transaction_id, target_status)

    if action_upper == "FREEZE":
        db.freeze_account(tx.sender_id)

    return updated_tx

@app.post("/api/reset")
def reset_database():
    """Resets synthetic database back to pristine initial state."""
    db.reset()
    return {"message": "Dataset reset successfully to default synthetic baseline."}
