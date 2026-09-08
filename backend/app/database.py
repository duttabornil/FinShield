from typing import Dict, List, Optional
from datetime import datetime
from .models import Account, Transaction, Alert, DashboardStats, RiskLevel, TransactionStatus
from .data_generator import DataGenerator

class Database:
    """
    In-memory state management for FinShield prototype.
    Stores synthetic accounts, transactions, and alerts.
    Supports atomic resets and live scenario injections.
    """

    def __init__(self):
        self.accounts: Dict[str, Account] = {}
        self.transactions: List[Transaction] = []
        self.alerts: List[Alert] = []
        self.reset()

    def reset(self):
        """Resets the dataset to standard initial synthetic state."""
        self.accounts, self.transactions, self.alerts = DataGenerator.generate_initial_dataset()

    def get_dashboard_stats(self) -> DashboardStats:
        total_tx = len(self.transactions)
        high_risk_tx = sum(
            1 for t in self.transactions
            if (t.risk_assessment and t.risk_assessment.score >= 60) or t.is_flagged
        )
        suspicious_accs = sum(
            1 for a in self.accounts.values()
            if a.risk_score >= 60 or a.type in ["CONFIRMED_MULE", "SUSPECTED_MULE", "CASHOUT_POINT"]
        )
        suspicious_money = sum(
            t.amount for t in self.transactions
            if (t.risk_assessment and t.risk_assessment.score >= 60) or t.is_flagged
        )

        # Risk distribution counts
        dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for t in self.transactions:
            if t.risk_assessment:
                lvl = t.risk_assessment.level.value
                if lvl in dist:
                    dist[lvl] += 1
            else:
                dist["LOW"] += 1

        # Calculate active fraud networks
        active_rings = 1  # Base mule chain
        for a in self.alerts:
            if "Fraud Ring" in a.title or "Mule Chain" in a.title:
                active_rings += 1
        active_rings = min(active_rings, 4)

        return DashboardStats(
            total_transactions=total_tx,
            high_risk_transactions=high_risk_tx,
            suspicious_accounts=suspicious_accs,
            suspicious_money_flow=round(suspicious_money, 2),
            risk_distribution=dist,
            recent_alerts=self.alerts[:5],
            active_fraud_networks=active_rings,
            demo_mode=True
        )

    def get_transactions(
        self,
        search: Optional[str] = None,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[Transaction]:
        results = self.transactions
        if search:
            q = search.lower()
            results = [
                t for t in results
                if q in t.id.lower()
                or q in t.sender_name.lower()
                or q in t.receiver_name.lower()
                or q in t.device.lower()
            ]
        if risk_level and risk_level != "ALL":
            results = [
                t for t in results
                if t.risk_assessment and t.risk_assessment.level.value == risk_level.upper()
            ]
        if status and status != "ALL":
            results = [
                t for t in results
                if t.status.value == status.upper()
            ]
        return results[:limit]

    def get_transaction(self, tx_id: str) -> Optional[Transaction]:
        for t in self.transactions:
            if t.id == tx_id:
                return t
        return None

    def update_transaction_status(self, tx_id: str, new_status: TransactionStatus) -> Optional[Transaction]:
        for t in self.transactions:
            if t.id == tx_id:
                t.status = new_status
                return t
        return None

    def get_account(self, account_id: str) -> Optional[Account]:
        return self.accounts.get(account_id)

    def freeze_account(self, account_id: str) -> Optional[Account]:
        acc = self.accounts.get(account_id)
        if acc:
            acc.is_frozen = True
        return acc

    def add_transaction(self, tx: Transaction):
        self.transactions.insert(0, tx)

    def add_alert(self, alert: Alert):
        self.alerts.insert(0, alert)

# Global singleton
db = Database()
