from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AccountType(str, Enum):
    REGULAR = "REGULAR"
    SUSPECTED_MULE = "SUSPECTED_MULE"
    CONFIRMED_MULE = "CONFIRMED_MULE"
    VICTIM = "VICTIM"
    CASHOUT_POINT = "CASHOUT_POINT"
    MERCHANT = "MERCHANT"

class TransactionStatus(str, Enum):
    PROCESSED = "PROCESSED"
    PAUSED = "PAUSED"
    VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED"
    FLAGGED = "FLAGGED"
    BLOCKED = "BLOCKED"
    APPROVED = "APPROVED"

class RiskFactor(BaseModel):
    name: str
    score_impact: int
    description: str

class RiskAssessment(BaseModel):
    score: int = Field(ge=0, le=100)
    level: RiskLevel
    reasons: List[str]
    factors: List[RiskFactor]
    recommended_action: str
    normal_avg_amount: float
    is_new_beneficiary: bool
    is_new_device: bool
    ai_narrative: str

class Account(BaseModel):
    id: str
    name: str
    account_number: str
    type: AccountType
    risk_score: int
    balance: float
    avg_transaction_amount: float
    known_devices: List[str]
    known_beneficiaries: List[str]
    created_date: str
    is_frozen: bool = False

class Transaction(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    receiver_id: str
    receiver_name: str
    amount: float
    timestamp: str
    device: str
    status: TransactionStatus
    risk_assessment: Optional[RiskAssessment] = None
    is_flagged: bool = False
    scenario_tag: Optional[str] = None

class NetworkNode(BaseModel):
    id: str
    label: str
    account_number: str
    type: str
    risk_score: int
    balance: float
    total_in: float
    total_out: float
    connections: int
    is_mule: bool
    is_frozen: bool

class NetworkEdge(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    timestamp: str
    risk_score: int
    is_suspicious: bool

class NetworkGraph(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    mule_chains: List[List[str]]
    suspicious_clusters: List[List[str]]
    stats: Dict[str, Any]

class Alert(BaseModel):
    id: str
    timestamp: str
    risk_level: RiskLevel
    risk_score: int
    title: str
    transaction_id: Optional[str] = None
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    amount: Optional[float] = None
    reason: str
    recommended_action: str
    status: str = "ACTIVE"  # ACTIVE, REVIEWED, DISMISSED, ACTIONED

class DashboardStats(BaseModel):
    total_transactions: int
    high_risk_transactions: int
    suspicious_accounts: int
    suspicious_money_flow: float
    risk_distribution: Dict[str, int]
    recent_alerts: List[Alert]
    active_fraud_networks: int
    demo_mode: bool = True

class AnalyzeRequest(BaseModel):
    sender_id: str
    receiver_id: str
    amount: float
    device: str
    timestamp: Optional[str] = None

class ActionRequest(BaseModel):
    action: str  # "PAUSE", "VERIFY", "PROCEED", "FREEZE"
    notes: Optional[str] = None

class SimulationResponse(BaseModel):
    scenario: str
    title: str
    message: str
    status: str
    transaction: Optional[Transaction] = None
    alert: Optional[Alert] = None
    highlight_nodes: List[str] = []
    mule_chain: List[str] = []
    graph_update: bool = True
