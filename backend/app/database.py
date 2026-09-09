from typing import Dict, List, Optional
from datetime import datetime
import os
from pathlib import Path

from dotenv import load_dotenv

from .models import Account, Transaction, Alert, DashboardStats, RiskLevel, TransactionStatus
from .data_generator import DataGenerator
from .ml_service import BenchmarkModel


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


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
        self._transaction_statuses: Dict[str, TransactionStatus] = {}
        self._postgres_engine = self._create_postgres_engine()
        self.reset()

    @staticmethod
    def _create_postgres_engine():
        url = os.getenv("DATABASE_URL")
        if not url:
            return None
        try:
            from sqlalchemy import create_engine
            return create_engine(url, pool_pre_ping=True)
        except ImportError:
            return None

    def _postgres_is_available(self) -> bool:
        if self._postgres_engine is None:
            return False
        from sqlalchemy import text
        from sqlalchemy.exc import SQLAlchemyError
        try:
            with self._postgres_engine.connect() as connection:
                connection.execute(text("SELECT 1 FROM transactions LIMIT 1"))
            return True
        except SQLAlchemyError:
            return False

    def reset(self):
        """Resets the dataset to standard initial synthetic state."""
        self.accounts, self.transactions, self.alerts = DataGenerator.generate_initial_dataset()
        self._transaction_statuses.clear()

    def get_dashboard_stats(self) -> DashboardStats:
        if self._postgres_is_available():
            return self._get_postgres_dashboard_stats()

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
            demo_mode=True,
            data_source="Synthetic Attack Simulator",
            model_performance=BenchmarkModel.metrics()
        )

    def _get_postgres_dashboard_stats(self) -> DashboardStats:
        from sqlalchemy import text

        with self._postgres_engine.connect() as connection:
            totals = connection.execute(text("""
                SELECT
                    COUNT(*) AS total_transactions,
                    COUNT(*) FILTER (WHERE is_fraud) AS high_risk_transactions,
                    COALESCE(SUM(amount) FILTER (WHERE is_fraud), 0) AS suspicious_money_flow
                FROM transactions
            """)).mappings().one()
            suspicious_accounts = connection.execute(text("""
                SELECT COUNT(*) FROM accounts
                WHERE is_fraud
            """)).scalar_one()
            alerts = self._postgres_alerts(connection, limit=5)

        return DashboardStats(
            total_transactions=totals["total_transactions"],
            high_risk_transactions=totals["high_risk_transactions"],
            suspicious_accounts=suspicious_accounts,
            suspicious_money_flow=float(totals["suspicious_money_flow"]),
            risk_distribution={
                "LOW": totals["total_transactions"] - totals["high_risk_transactions"],
                "MEDIUM": 0,
                "HIGH": 0,
                "CRITICAL": totals["high_risk_transactions"],
            },
            recent_alerts=alerts,
            active_fraud_networks=0,
            demo_mode=False,
            data_source="Imported PostgreSQL Dataset",
            model_performance=BenchmarkModel.metrics()
        )

    def get_transactions(
        self,
        search: Optional[str] = None,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[Transaction]:
        if self._postgres_is_available():
            return self._get_postgres_transactions(search, risk_level, status, limit)

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

    def _get_postgres_transactions(self, search, risk_level, status, limit):
        from sqlalchemy import text

        conditions = []
        params = {"limit": limit}
        if search:
            conditions.append("(CAST(transaction_id AS TEXT) ILIKE :search OR sender_account_id ILIKE :search OR receiver_account_id ILIKE :search)")
            params["search"] = f"%{search}%"
        if risk_level and risk_level != "ALL":
            if risk_level.upper() in {"CRITICAL", "HIGH"}:
                conditions.append("is_fraud")
            elif risk_level.upper() == "LOW":
                conditions.append("NOT is_fraud")
            else:
                return []
        if status and status.upper() not in {"ALL", "PROCESSED"}:
            return []

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = text(f"""
            SELECT transaction_id, sender_account_id, receiver_account_id,
                   amount, event_time, is_fraud
            FROM transactions
            {where_clause}
            ORDER BY transaction_id
            LIMIT :limit
        """)
        with self._postgres_engine.connect() as connection:
            rows = connection.execute(query, params).mappings()
            return [self._postgres_transaction(row) for row in rows]

    def _postgres_transaction(self, row) -> Transaction:
        transaction_id = str(row["transaction_id"])
        return Transaction(
            id=transaction_id,
            sender_id=str(row["sender_account_id"]),
            sender_name=str(row["sender_account_id"]),
            receiver_id=str(row["receiver_account_id"]),
            receiver_name=str(row["receiver_account_id"]),
            amount=float(row["amount"]),
            timestamp=str(row["event_time"]),
            device="CSV_IMPORT",
            status=self._transaction_statuses.get(transaction_id, TransactionStatus.PROCESSED),
            is_flagged=bool(row["is_fraud"]),
            scenario_tag="postgres_import",
        )

    def get_transaction(self, tx_id: str) -> Optional[Transaction]:
        for transaction in self.transactions:
            if transaction.id == tx_id:
                return transaction

        if self._postgres_is_available():
            from sqlalchemy import text
            with self._postgres_engine.connect() as connection:
                row = connection.execute(text("""
                    SELECT transaction_id, sender_account_id, receiver_account_id,
                           amount, event_time, is_fraud
                    FROM transactions
                    WHERE transaction_id = :transaction_id
                """), {"transaction_id": tx_id}).mappings().first()
            if row:
                return self._postgres_transaction(row)

        return None

    def update_transaction_status(self, tx_id: str, new_status: TransactionStatus) -> Optional[Transaction]:
        for t in self.transactions:
            if t.id == tx_id:
                t.status = new_status
                return t

        if self._postgres_is_available():
            transaction = self.get_transaction(tx_id)
            if transaction:
                self._transaction_statuses[tx_id] = new_status
                transaction.status = new_status
                return transaction
        return None

    def get_account(self, account_id: str) -> Optional[Account]:
        return self.accounts.get(account_id)

    def get_alerts(self) -> List[Alert]:
        if self._postgres_is_available():
            from sqlalchemy import text
            with self._postgres_engine.connect() as connection:
                return self._postgres_alerts(connection) + self.alerts
        return self.alerts

    @staticmethod
    def _postgres_alerts(connection, limit=None) -> List[Alert]:
        from sqlalchemy import text

        limit_clause = "LIMIT :limit" if limit else ""
        params = {"limit": limit} if limit else {}
        rows = connection.execute(text(f"""
            SELECT alert_id, alert_type, is_fraud, transaction_id,
                   amount, event_time
            FROM alerts
            ORDER BY alert_id
            {limit_clause}
        """), params).mappings()
        return [
            Alert(
                id=str(row["alert_id"]),
                timestamp=str(row["event_time"]),
                risk_level=RiskLevel.CRITICAL if row["is_fraud"] else RiskLevel.LOW,
                risk_score=100 if row["is_fraud"] else 0,
                title=str(row["alert_type"]),
                transaction_id=str(row["transaction_id"]) if row["transaction_id"] is not None else None,
                amount=float(row["amount"]) if row["amount"] is not None else None,
                reason="Imported alert from the PostgreSQL dataset.",
                recommended_action="Review transaction" if row["is_fraud"] else "Monitor",
            )
            for row in rows
        ]

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
