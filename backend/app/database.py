from typing import Dict, List, Optional
import os
from pathlib import Path

from dotenv import load_dotenv

from .models import (
    Account,
    AccountType,
    Transaction,
    Alert,
    DashboardStats,
    RiskLevel,
    TransactionStatus,
)

from .data_generator import DataGenerator
from .ml_service import BenchmarkModel
from .risk_engine import RiskEngine


# -------------------------------------------------------------
# ENVIRONMENT
# -------------------------------------------------------------

load_dotenv(
    Path(__file__).resolve().parents[2] / ".env"
)


class Database:
    """
    FinShield database/state adapter.

    Primary runtime:
        PostgreSQL

    Compatibility fallback:
        In-memory synthetic dataset

    PostgreSQL is used automatically when DATABASE_URL is
    configured and the database is reachable.
    """

    def __init__(self):

        self.accounts: Dict[str, Account] = {}

        self.transactions: List[Transaction] = []

        self.alerts: List[Alert] = []

        self._transaction_statuses: Dict[
            str,
            TransactionStatus
        ] = {}

        self._postgres_engine = (
            self._create_postgres_engine()
        )

        self.reset()

    # ---------------------------------------------------------
    # POSTGRES CONNECTION
    # ---------------------------------------------------------

    @staticmethod
    def _create_postgres_engine():

        url = os.getenv(
            "DATABASE_URL"
        )

        if not url:
            return None

        try:

            from sqlalchemy import create_engine

            return create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=1800,
            )

        except ImportError:

            return None

    def _postgres_is_available(self) -> bool:

        if self._postgres_engine is None:
            return False

        try:

            from sqlalchemy import text
            from sqlalchemy.exc import SQLAlchemyError

            with self._postgres_engine.connect() as connection:

                connection.execute(
                    text(
                        "SELECT 1 FROM transactions LIMIT 1"
                    )
                )

            return True

        except SQLAlchemyError:

            return False

        except Exception:

            return False

    # ---------------------------------------------------------
    # HELPERS
    # ---------------------------------------------------------

    @staticmethod
    def _database_bool(value) -> bool:

        if isinstance(value, str):

            return (
                value.strip().lower()
                in {
                    "true",
                    "1",
                    "t",
                    "yes",
                }
            )

        return bool(value)

    @staticmethod
    def _safe_float(value, default=0.0) -> float:

        try:

            if value is None:
                return default

            return float(value)

        except (
            TypeError,
            ValueError,
        ):

            return default

    @staticmethod
    def _risk_timestamp(value) -> Optional[str]:
        """
        Convert the dataset's relative simulation timestamp
        into HH:MM:SS.

        IMPORTANT:

        The imported transactions.csv stores TIMESTAMP as
        elapsed/simulation seconds, NOT Unix epoch time.

        Therefore:

            0       -> 00:00:00
            3600    -> 01:00:00
            7200    -> 02:00:00
            43200   -> 12:00:00

        The modulo operation keeps the value inside a
        24-hour day so the RiskEngine can identify
        off-peak transaction windows.
        """

        if value is None:
            return None

        try:

            seconds = float(value)

            if seconds < 0:
                return None

            seconds_today = (
                seconds % 86400
            )

            hour = int(
                seconds_today // 3600
            )

            minute = int(
                (seconds_today % 3600) // 60
            )

            second = int(
                seconds_today % 60
            )

            return (
                f"{hour:02d}:"
                f"{minute:02d}:"
                f"{second:02d}"
            )

        except (
            TypeError,
            ValueError,
            OverflowError,
        ):

            return None

    # ---------------------------------------------------------
    # RESET
    # ---------------------------------------------------------

    def reset(self):

        """
        Reset only the in-memory simulator state.

        PostgreSQL imported data is intentionally preserved.
        """

        (
            self.accounts,
            self.transactions,
            self.alerts,
        ) = DataGenerator.generate_initial_dataset()

        self._transaction_statuses.clear()

    # ---------------------------------------------------------
    # DASHBOARD
    # ---------------------------------------------------------

    def get_dashboard_stats(
        self
    ) -> DashboardStats:

        if self._postgres_is_available():

            return (
                self._get_postgres_dashboard_stats()
            )

        # -----------------------------------------------------
        # IN-MEMORY FALLBACK
        # -----------------------------------------------------

        total_tx = len(
            self.transactions
        )

        high_risk_tx = sum(
            1
            for t in self.transactions
            if (
                t.risk_assessment
                and t.risk_assessment.score >= 60
            )
            or t.is_flagged
        )

        suspicious_accs = sum(
            1
            for a in self.accounts.values()
            if (
                a.risk_score >= 60
                or a.type in {
                    "CONFIRMED_MULE",
                    "SUSPECTED_MULE",
                    "CASHOUT_POINT",
                }
            )
        )

        suspicious_money = sum(
            t.amount
            for t in self.transactions
            if (
                t.risk_assessment
                and t.risk_assessment.score >= 60
            )
            or t.is_flagged
        )

        dist = {
            "LOW": 0,
            "MEDIUM": 0,
            "HIGH": 0,
            "CRITICAL": 0,
        }

        for t in self.transactions:

            if t.risk_assessment:

                level = (
                    t.risk_assessment.level.value
                )

                if level in dist:
                    dist[level] += 1

            else:

                dist["LOW"] += 1

        active_rings = 1

        for alert in self.alerts:

            if (
                "Fraud Ring" in alert.title
                or "Mule Chain" in alert.title
            ):

                active_rings += 1

        active_rings = min(
            active_rings,
            4
        )

        return DashboardStats(
            total_transactions=total_tx,
            high_risk_transactions=high_risk_tx,
            suspicious_accounts=suspicious_accs,
            suspicious_money_flow=round(
                suspicious_money,
                2
            ),
            risk_distribution=dist,
            recent_alerts=self.alerts[:5],
            active_fraud_networks=active_rings,
            demo_mode=True,
            data_source="Synthetic Attack Simulator",
            model_performance=BenchmarkModel.metrics(),
        )

    # ---------------------------------------------------------
    # POSTGRES DASHBOARD
    # ---------------------------------------------------------

    def _get_postgres_dashboard_stats(
        self
    ) -> DashboardStats:

        from sqlalchemy import text

        with self._postgres_engine.connect() as connection:

            totals = connection.execute(
                text(
                    """
                    SELECT
                        COUNT(*) AS total_transactions,

                        COUNT(*)
                        FILTER (WHERE is_fraud)
                        AS fraud_transactions,

                        COALESCE(
                            SUM(amount)
                            FILTER (WHERE is_fraud),
                            0
                        ) AS suspicious_money_flow

                    FROM transactions
                    """
                )
            ).mappings().one()

            suspicious_accounts = (
                connection.execute(
                    text(
                        """
                        SELECT COUNT(*)
                        FROM accounts
                        WHERE is_fraud
                        """
                    )
                ).scalar_one()
            )

            alerts = self._postgres_alerts(
                connection,
                limit=5
            )

        total_transactions = int(
            totals["total_transactions"]
        )

        fraud_transactions = int(
            totals["fraud_transactions"]
        )

        return DashboardStats(
            total_transactions=total_transactions,

            high_risk_transactions=fraud_transactions,

            suspicious_accounts=int(
                suspicious_accounts
            ),

            suspicious_money_flow=float(
                totals["suspicious_money_flow"]
            ),

            # IMPORTANT:
            # These values are dataset-label counts,
            # not FinShield predicted risk tiers.
            #
            # The detailed transaction API calculates
            # actual FinShield risk tiers independently.
            risk_distribution={
                "LOW": (
                    total_transactions
                    - fraud_transactions
                ),
                "MEDIUM": 0,
                "HIGH": 0,
                "CRITICAL": fraud_transactions,
            },

            recent_alerts=alerts,

            active_fraud_networks=0,

            demo_mode=False,

            data_source=(
                "Imported PostgreSQL Dataset + "
                "FinShield Behavioral/Network Engine"
            ),

            model_performance=(
                BenchmarkModel.metrics()
            ),
        )

    # ---------------------------------------------------------
    # TRANSACTIONS
    # ---------------------------------------------------------

    def get_transactions(
        self,
        search: Optional[str] = None,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[Transaction]:

        if self._postgres_is_available():

            return self._get_postgres_transactions(
                search,
                risk_level,
                status,
                limit,
            )

        # -----------------------------------------------------
        # IN-MEMORY FALLBACK
        # -----------------------------------------------------

        results = self.transactions

        if search:

            q = search.lower()

            results = [
                t
                for t in results
                if (
                    q in t.id.lower()
                    or q in t.sender_name.lower()
                    or q in t.receiver_name.lower()
                    or q in t.device.lower()
                )
            ]

        if risk_level and risk_level != "ALL":

            normalized_risk = (
                risk_level.upper()
            )

            if normalized_risk == "FRAUD_LABELED":

                results = [
                    t
                    for t in results
                    if t.is_flagged
                ]

            else:

                results = [
                    t
                    for t in results
                    if (
                        t.risk_assessment
                        and
                        t.risk_assessment.level.value
                        == normalized_risk
                    )
                ]

        if status and status != "ALL":

            normalized_status = (
                status.upper()
            )

            results = [
                t
                for t in results
                if (
                    t.status.value
                    == normalized_status
                )
            ]

        return results[:limit]

    # ---------------------------------------------------------
    # POSTGRES TRANSACTIONS
    # ---------------------------------------------------------

    def _get_postgres_transactions(
        self,
        search,
        risk_level,
        status,
        limit,
    ):

        from sqlalchemy import text

        conditions = []

        params = {
            "limit": limit
        }

        normalized_risk = (
            risk_level.upper()
            if risk_level
            else "ALL"
        )

        supported_risks = {
            "ALL",
            "FRAUD_LABELED",
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL",
        }

        if normalized_risk not in supported_risks:
            return []

        # -----------------------------------------------------
        # SEARCH
        # -----------------------------------------------------

        if search:

            conditions.append(
                """
                (
                    CAST(transaction_id AS TEXT)
                    ILIKE :search

                    OR sender_account_id
                    ILIKE :search

                    OR receiver_account_id
                    ILIKE :search
                )
                """
            )

            params["search"] = (
                f"%{search}%"
            )

        # -----------------------------------------------------
        # GROUND TRUTH FILTER
        # -----------------------------------------------------

        if normalized_risk == "FRAUD_LABELED":

            conditions.append(
                "is_fraud"
            )

        # -----------------------------------------------------
        # STATUS
        # -----------------------------------------------------

        if (
            status
            and status.upper()
            not in {
                "ALL",
                "PROCESSED",
            }
        ):

            return []

        # -----------------------------------------------------
        # FETCH CANDIDATES
        # -----------------------------------------------------

        if normalized_risk in {
            "ALL",
            "FRAUD_LABELED",
        }:

            candidate_limit = limit

        else:

            # Risk is calculated in Python after
            # feature extraction, so fetch a wider
            # candidate window.
            candidate_limit = max(
                limit * 20,
                1000
            )

        params["limit"] = candidate_limit

        where_clause = (
            "WHERE "
            + " AND ".join(conditions)
            if conditions
            else ""
        )

        query = text(
            f"""
            SELECT
                transaction_id,
                sender_account_id,
                receiver_account_id,
                amount,
                event_time,
                is_fraud
            FROM transactions

            {where_clause}

            ORDER BY transaction_id

            LIMIT :limit
            """
        )

        with self._postgres_engine.connect() as connection:

            rows = (
                connection.execute(
                    query,
                    params
                )
                .mappings()
            )

            transactions = [
                self._postgres_transaction(
                    row,
                    connection
                )
                for row in rows
            ]

        # -----------------------------------------------------
        # DIRECT DATASET FILTERS
        # -----------------------------------------------------

        if normalized_risk in {
            "ALL",
            "FRAUD_LABELED",
        }:

            return transactions[:limit]

        # -----------------------------------------------------
        # FINSHIELD RISK FILTER
        # -----------------------------------------------------

        return [
            transaction
            for transaction in transactions
            if (
                transaction.risk_assessment
                and
                transaction.risk_assessment.level.value
                == normalized_risk
            )
        ][:limit]

    # ---------------------------------------------------------
    # POSTGRES RISK ASSESSMENT
    # ---------------------------------------------------------

    def _postgres_risk_assessment(
        self,
        row,
        connection,
    ):

        from sqlalchemy import text

        transaction_id = int(
            row["transaction_id"]
        )

        sender_id = str(
            row["sender_account_id"]
        )

        receiver_id = str(
            row["receiver_account_id"]
        )

        event_time_value = (
            row.get("event_time")
        )

        event_time = (
            self._safe_float(
                event_time_value,
                None
            )
            if event_time_value is not None
            else None
        )

        # -----------------------------------------------------
        # ACCOUNT CONTEXT
        # -----------------------------------------------------

        account_rows = connection.execute(
            text(
                """
                SELECT
                    account_id,
                    initial_balance,
                    is_fraud
                FROM accounts
                WHERE account_id IN (
                    :sender_id,
                    :receiver_id
                )
                """
            ),
            {
                "sender_id": sender_id,
                "receiver_id": receiver_id,
            },
        ).mappings()

        account_by_id = {
            str(account["account_id"]): account
            for account in account_rows
        }

        sender_row = (
            account_by_id.get(
                sender_id,
                {}
            )
        )

        receiver_row = (
            account_by_id.get(
                receiver_id,
                {}
            )
        )

        # -----------------------------------------------------
        # PRIOR-TRANSACTION CONDITION
        # -----------------------------------------------------

        history_params = {
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "event_time": event_time,
            "transaction_id": transaction_id,
        }

        if event_time is not None:

            prior_transaction = """
                (
                    event_time < :event_time
                    OR (
                        event_time = :event_time
                        AND transaction_id < :transaction_id
                    )
                )
            """

        else:

            prior_transaction = "FALSE"

        # -----------------------------------------------------
        # HISTORICAL AMOUNT
        # -----------------------------------------------------

        prior_amount = connection.execute(
            text(
                f"""
                SELECT AVG(amount)

                FROM transactions

                WHERE sender_account_id = :sender_id

                AND {prior_transaction}
                """
            ),
            history_params,
        ).scalar_one()

        has_amount_history = (
            prior_amount is not None
        )

        # -----------------------------------------------------
        # BENEFICIARY HISTORY
        # -----------------------------------------------------

        prior_beneficiary = (
            connection.execute(
                text(
                    f"""
                    SELECT EXISTS(

                        SELECT 1

                        FROM transactions

                        WHERE sender_account_id =
                              :sender_id

                        AND receiver_account_id =
                            :receiver_id

                        AND {prior_transaction}
                    )
                    """
                ),
                history_params,
            ).scalar_one()
        )

        # -----------------------------------------------------
        # 10-MINUTE VELOCITY
        # -----------------------------------------------------

        velocity = 0

        if event_time is not None:

            window_start = max(
                0.0,
                event_time - 600.0
            )

            velocity = connection.execute(
                text(
                    f"""
                    SELECT COUNT(*)

                    FROM transactions

                    WHERE sender_account_id =
                          :sender_id

                    AND event_time >= :window_start

                    AND {prior_transaction}
                    """
                ),
                {
                    **history_params,
                    "window_start": window_start,
                },
            ).scalar_one()

        # -----------------------------------------------------
        # NETWORK RISK
        # -----------------------------------------------------

        receiver_is_fraud = (
            self._database_bool(
                receiver_row.get(
                    "is_fraud",
                    False
                )
            )
        )

        sender_balance = (
            self._safe_float(
                sender_row.get(
                    "initial_balance"
                ),
                0.0
            )
        )

        average_amount = (
            self._safe_float(
                prior_amount,
                0.0
            )
        )

        # -----------------------------------------------------
        # BUILD RISK ENGINE ACCOUNTS
        # -----------------------------------------------------

        sender = Account(
            id=sender_id,

            name=sender_id,

            account_number=sender_id,

            type=AccountType.REGULAR,

            risk_score=0,

            balance=sender_balance,

            avg_transaction_amount=(
                average_amount
            ),

            # Device telemetry does not exist in
            # transactions.csv, so we do NOT fabricate it.
            known_devices=[],

            # This is correct:
            #
            # If prior beneficiary exists:
            #     receiver is trusted -> no +20
            #
            # If prior beneficiary does not exist:
            #     receiver is new -> +20
            known_beneficiaries=(
                [receiver_id]
                if prior_beneficiary
                else []
            ),

            created_date="",
        )

        receiver = Account(
            id=receiver_id,

            name=receiver_id,

            account_number=receiver_id,

            type=(
                AccountType.CONFIRMED_MULE
                if receiver_is_fraud
                else AccountType.REGULAR
            ),

            # IMPORTANT:
            #
            # The dataset fraud label is being used here
            # ONLY as network/account context.
            #
            # It is NOT directly converted into a
            # transaction risk score.
            risk_score=(
                100
                if receiver_is_fraud
                else 0
            ),

            balance=self._safe_float(
                receiver_row.get(
                    "initial_balance"
                ),
                0.0
            ),

            avg_transaction_amount=0.0,

            known_devices=[],

            known_beneficiaries=[],

            created_date="",
        )

        # -----------------------------------------------------
        # RISK ENGINE EVALUATION
        # -----------------------------------------------------

        risk_timestamp = (
            self._risk_timestamp(
                event_time
            )
        )

        assessment = RiskEngine.evaluate(
            sender=sender,

            receiver=receiver,

            amount=self._safe_float(
                row["amount"],
                0.0
            ),

            # Dataset does not contain device telemetry.
            device=None,

            # Use relative simulation time correctly.
            timestamp_str=risk_timestamp,

            # Number of prior transfers in
            # previous 10 minutes.
            recent_tx_count=int(
                velocity or 0
            ),

            # Network/account context only.
            receiver_network_risk=(
                receiver_is_fraud
            ),

            amount_history_available=(
                has_amount_history
            ),
        )

        # -----------------------------------------------------
        # DATA SOURCE METADATA
        # -----------------------------------------------------

        assessment.data_source = (
            "PostgreSQL transaction history + "
            "FinShield behavioral/network rules"
        )

        return assessment

    # ---------------------------------------------------------
    # CONVERT POSTGRES ROW TO API TRANSACTION
    # ---------------------------------------------------------

    def _postgres_transaction(
        self,
        row,
        connection=None,
    ) -> Transaction:

        transaction_id = str(
            row["transaction_id"]
        )

        assessment = (
            self._postgres_risk_assessment(
                row,
                connection
            )
            if connection is not None
            else None
        )

        event_time = row.get(
            "event_time"
        )

        risk_timestamp = (
            self._risk_timestamp(
                event_time
            )
        )

        # -----------------------------------------------------
        # STATUS
        # -----------------------------------------------------

        status = (
            self._transaction_statuses.get(
                transaction_id,
                TransactionStatus.PROCESSED
            )
        )

        # -----------------------------------------------------
        # API TRANSACTION
        # -----------------------------------------------------

        return Transaction(

            id=transaction_id,

            sender_id=str(
                row["sender_account_id"]
            ),

            sender_name=str(
                row["sender_account_id"]
            ),

            receiver_id=str(
                row["receiver_account_id"]
            ),

            receiver_name=str(
                row["receiver_account_id"]
            ),

            amount=self._safe_float(
                row["amount"],
                0.0
            ),

            # Display the relative simulation time
            # as HH:MM:SS instead of 1970-01-01.
            timestamp=(
                risk_timestamp
                if risk_timestamp is not None
                else "UNKNOWN"
            ),

            # The dataset does not provide device data.
            device="UNAVAILABLE",

            status=status,

            risk_assessment=assessment,

            # Ground-truth dataset label.
            #
            # This is NOT the same thing as the
            # FinShield predicted risk level.
            is_flagged=self._database_bool(
                row["is_fraud"]
            ),

            scenario_tag="postgres_import",
        )

    # ---------------------------------------------------------
    # SINGLE TRANSACTION
    # ---------------------------------------------------------

    def get_transaction(
        self,
        tx_id: str
    ) -> Optional[Transaction]:

        # -----------------------------------------------------
        # IN-MEMORY
        # -----------------------------------------------------

        for transaction in self.transactions:

            if transaction.id == tx_id:

                return transaction

        # -----------------------------------------------------
        # POSTGRES
        # -----------------------------------------------------

        if self._postgres_is_available():

            from sqlalchemy import text

            try:

                transaction_id = int(
                    tx_id
                )

            except (
                TypeError,
                ValueError,
            ):

                return None

            with self._postgres_engine.connect() as connection:

                row = connection.execute(
                    text(
                        """
                        SELECT
                            transaction_id,
                            sender_account_id,
                            receiver_account_id,
                            amount,
                            event_time,
                            is_fraud
                        FROM transactions
                        WHERE transaction_id =
                              :transaction_id
                        """
                    ),
                    {
                        "transaction_id":
                            transaction_id
                    },
                ).mappings().first()

                if row:

                    return (
                        self._postgres_transaction(
                            row,
                            connection
                        )
                    )

        return None

    # ---------------------------------------------------------
    # ACCOUNT LOOKUP
    # ---------------------------------------------------------

    def get_account(
        self,
        account_id: str
    ) -> Optional[Account]:

        account_id = str(
            account_id
        )

        # -----------------------------------------------------
        # IN-MEMORY
        # -----------------------------------------------------

        account = self.accounts.get(
            account_id
        )

        if account is not None:

            return account

        # -----------------------------------------------------
        # POSTGRES
        # -----------------------------------------------------

        if not self._postgres_is_available():

            return None

        from sqlalchemy import text

        with self._postgres_engine.connect() as connection:

            account_row = connection.execute(
                text(
                    """
                    SELECT
                        account_id,
                        initial_balance,
                        is_fraud
                    FROM accounts
                    WHERE account_id =
                          :account_id
                    """
                ),
                {
                    "account_id": account_id
                },
            ).mappings().first()

            if not account_row:

                return None

            # -------------------------------------------------
            # HISTORICAL AVERAGE
            # -------------------------------------------------

            avg_amount = connection.execute(
                text(
                    """
                    SELECT AVG(amount)
                    FROM transactions
                    WHERE sender_account_id =
                          :account_id
                    """
                ),
                {
                    "account_id": account_id
                },
            ).scalar_one()

            # -------------------------------------------------
            # ACCOUNT
            # -------------------------------------------------

            return Account(

                id=account_id,

                name=account_id,

                account_number=account_id,

                type=(
                    AccountType.CONFIRMED_MULE
                    if self._database_bool(
                        account_row.get(
                            "is_fraud",
                            False
                        )
                    )
                    else AccountType.REGULAR
                ),

                risk_score=(
                    100
                    if self._database_bool(
                        account_row.get(
                            "is_fraud",
                            False
                        )
                    )
                    else 0
                ),

                balance=self._safe_float(
                    account_row.get(
                        "initial_balance"
                    ),
                    0.0
                ),

                avg_transaction_amount=(
                    self._safe_float(
                        avg_amount,
                        0.0
                    )
                ),

                # Device telemetry is not available
                # in the imported dataset.
                known_devices=[],

                known_beneficiaries=[],

                created_date="",
            )

    # ---------------------------------------------------------
    # UPDATE TRANSACTION STATUS
    # ---------------------------------------------------------

    def update_transaction_status(
        self,
        tx_id: str,
        new_status: TransactionStatus,
    ) -> Optional[Transaction]:

        # -----------------------------------------------------
        # IN-MEMORY
        # -----------------------------------------------------

        for transaction in self.transactions:

            if transaction.id == tx_id:

                transaction.status = (
                    new_status
                )

                return transaction

        # -----------------------------------------------------
        # POSTGRES
        # -----------------------------------------------------

        if self._postgres_is_available():

            transaction = self.get_transaction(
                tx_id
            )

            if transaction:

                self._transaction_statuses[
                    tx_id
                ] = new_status

                transaction.status = (
                    new_status
                )

                return transaction

        return None

    # ---------------------------------------------------------
    # ALERTS
    # ---------------------------------------------------------

    def get_alerts(
        self
    ) -> List[Alert]:

        if self._postgres_is_available():

            from sqlalchemy import text

            with self._postgres_engine.connect() as connection:

                return (
                    self._postgres_alerts(
                        connection
                    )
                    + self.alerts
                )

        return self.alerts

    @staticmethod
    def _postgres_alerts(
        connection,
        limit=None,
    ) -> List[Alert]:

        from sqlalchemy import text

        limit_clause = (
            "LIMIT :limit"
            if limit
            else ""
        )

        params = (
            {"limit": limit}
            if limit
            else {}
        )

        rows = connection.execute(
            text(
                f"""
                SELECT
                    alert_id,
                    alert_type,
                    is_fraud,
                    transaction_id,
                    amount,
                    event_time
                FROM alerts
                ORDER BY alert_id
                {limit_clause}
                """
            ),
            params,
        ).mappings()

        result = []

        for row in rows:

            event_time = row.get(
                "event_time"
            )

            timestamp = (
                Database._risk_timestamp(
                    event_time
                )
                or "UNKNOWN"
            )

            is_fraud = (
                Database._database_bool(
                    row["is_fraud"]
                )
            )

            result.append(
                Alert(

                    id=str(
                        row["alert_id"]
                    ),

                    timestamp=timestamp,

                    risk_level=(
                        RiskLevel.CRITICAL
                        if is_fraud
                        else RiskLevel.LOW
                    ),

                    risk_score=(
                        100
                        if is_fraud
                        else 0
                    ),

                    title=str(
                        row["alert_type"]
                    ),

                    transaction_id=(
                        str(
                            row["transaction_id"]
                        )
                        if row["transaction_id"]
                        is not None
                        else None
                    ),

                    amount=(
                        float(
                            row["amount"]
                        )
                        if row["amount"] is not None
                        else None
                    ),

                    reason=(
                        "Imported alert from the "
                        "PostgreSQL dataset."
                    ),

                    recommended_action=(
                        "Review transaction"
                        if is_fraud
                        else "Monitor"
                    ),
                )
            )

        return result

    # ---------------------------------------------------------
    # FREEZE ACCOUNT
    # ---------------------------------------------------------

    def freeze_account(
        self,
        account_id: str
    ) -> Optional[Account]:

        account = self.accounts.get(
            account_id
        )

        if account:

            account.is_frozen = True

        return account

    # ---------------------------------------------------------
    # IN-MEMORY TRANSACTION
    # ---------------------------------------------------------

    def add_transaction(
        self,
        tx: Transaction
    ):

        self.transactions.insert(
            0,
            tx
        )

    # ---------------------------------------------------------
    # IN-MEMORY ALERT
    # ---------------------------------------------------------

    def add_alert(
        self,
        alert: Alert
    ):

        self.alerts.insert(
            0,
            alert
        )


# -------------------------------------------------------------
# GLOBAL DATABASE INSTANCE
# -------------------------------------------------------------

db = Database()