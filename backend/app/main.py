from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from typing import Optional, List, Dict, Any

from .models import (
    DashboardStats,
    Transaction,
    Account,
    Alert,
    AnalyzeRequest,
    RiskAssessment,
    ActionRequest,
    SimulationResponse,
    TransactionStatus,
)

from .database import db
from .risk_engine import RiskEngine
from .graph_engine import GraphEngine
from .simulator import AttackSimulator
from .ml_service import benchmark_model


app = FastAPI(
    title="FinShield API",
    description=(
        "AI-Powered Financial Fraud Defense Network "
        "- Prototype Backend"
    ),
    version="1.0.0",
)


# ----------------------------------------------------------------------
# CORS
# ----------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------------------------------------
# Root
# ----------------------------------------------------------------------

@app.get("/")
def root():

    return {
        "app": "FinShield",
        "tagline": "Detect. Understand. Expose.",
        "status": "ONLINE",
        "environment": "SYNTHETIC_HACKATHON_PROTOTYPE",
        "docs_url": "/docs",
    }


# ----------------------------------------------------------------------
# Dashboard
# ----------------------------------------------------------------------

@app.get(
    "/api/dashboard",
    response_model=DashboardStats,
)
def get_dashboard():
    """
    Returns top-level KPIs, risk distribution,
    recent alerts, and model information.
    """

    return db.get_dashboard_stats()


# ----------------------------------------------------------------------
# Transactions
# ----------------------------------------------------------------------

@app.get(
    "/api/transactions",
    response_model=List[Transaction],
)
def get_transactions(
    search: Optional[str] = Query(
        None,
        description=(
            "Search by transaction ID, "
            "sender, receiver, or device"
        ),
    ),

    risk_level: Optional[str] = Query(
        None,
        description=(
            "Filter by LOW, MEDIUM, HIGH, CRITICAL"
        ),
    ),

    status: Optional[str] = Query(
        None,
        description=(
            "Filter by PROCESSED, PAUSED, "
            "FLAGGED, BLOCKED"
        ),
    ),

    limit: int = Query(
        100,
        ge=1,
        le=200,
    ),
):

    return db.get_transactions(
        search=search,
        risk_level=risk_level,
        status=status,
        limit=limit,
    )


# ----------------------------------------------------------------------
# Single transaction investigation
# ----------------------------------------------------------------------

@app.get(
    "/api/transactions/{transaction_id}",
    response_model=Transaction,
)
def get_transaction_by_id(
    transaction_id: str,
):

    tx = db.get_transaction(
        transaction_id
    )

    if not tx:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Transaction "
                f"'{transaction_id}' not found."
            ),
        )

    return tx


# ----------------------------------------------------------------------
# Manual transaction analysis
# ----------------------------------------------------------------------

@app.post(
    "/api/analyze",
    response_model=RiskAssessment,
)
def analyze_transaction(
    req: AnalyzeRequest,
):
    """
    Analyze a transaction using the FinShield RiskEngine.

    Important design decision:

    The deterministic FinShield rule/network score is authoritative.
    Benchmark ML can only:
        1. support the decision
        2. increase the score

    It cannot downgrade a strong rule-based fraud signal.

    This prevents an unrelated benchmark model from masking a clear
    new-beneficiary / unusual-amount / suspicious-network pattern.
    """

    # --------------------------------------------------------------
    # Load sender
    # --------------------------------------------------------------

    sender = db.get_account(
        req.sender_id
    )

    if not sender:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Sender account "
                f"'{req.sender_id}' not found."
            ),
        )

    # --------------------------------------------------------------
    # Load receiver
    # --------------------------------------------------------------

    receiver = db.get_account(
        req.receiver_id
    )

    if not receiver:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Receiver account "
                f"'{req.receiver_id}' not found."
            ),
        )

    # --------------------------------------------------------------
    # PostgreSQL-aware historical context
    #
    # For a manually submitted transaction, determine whether this
    # sender has previously paid this receiver.
    #
    # The current RiskEngine expects:
    #
    # known_beneficiaries contains receiver ID
    #     -> beneficiary is NOT new
    #
    # empty list
    #     -> beneficiary IS new
    # --------------------------------------------------------------

    prior_beneficiary = False
    historical_average = 0.0
    amount_history_available = False
    recent_tx_count = 0

    postgres_available = db._postgres_is_available()

    if postgres_available:

        from sqlalchemy import text

        try:

            with db._postgres_engine.connect() as connection:

                # --------------------------------------------------
                # Historical average
                # --------------------------------------------------

                prior_average = connection.execute(
                    text(
                        """
                        SELECT AVG(amount)
                        FROM transactions
                        WHERE sender_account_id = :sender_id
                        """
                    ),
                    {
                        "sender_id": req.sender_id
                    },
                ).scalar_one()

                if (
                    prior_average is not None
                    and float(prior_average) > 0
                ):

                    historical_average = float(
                        prior_average
                    )

                    amount_history_available = True

                # --------------------------------------------------
                # Prior beneficiary
                # --------------------------------------------------

                prior_beneficiary = bool(
                    connection.execute(
                        text(
                            """
                            SELECT EXISTS(
                                SELECT 1
                                FROM transactions
                                WHERE
                                    sender_account_id =
                                    :sender_id

                                    AND receiver_account_id =
                                    :receiver_id
                            )
                            """
                        ),
                        {
                            "sender_id": req.sender_id,
                            "receiver_id": req.receiver_id,
                        },
                    ).scalar_one()
                )

        except Exception:
            # Manual analysis should still work even if the optional
            # historical query fails.
            prior_beneficiary = False
            historical_average = 0.0
            amount_history_available = False

    # --------------------------------------------------------------
    # Construct analysis account
    # --------------------------------------------------------------

    sender.known_beneficiaries = (
        [req.receiver_id]
        if prior_beneficiary
        else []
    )

    sender.avg_transaction_amount = (
        historical_average
    )

    # --------------------------------------------------------------
    # Network risk
    # --------------------------------------------------------------

    receiver_network_risk = (
        receiver.risk_score >= 60
        or receiver.type.value
        in {
            "CONFIRMED_MULE",
            "SUSPECTED_MULE",
            "CASHOUT_POINT",
        }
    )

    # --------------------------------------------------------------
    # FINSHIELD CORE RISK ENGINE
    # --------------------------------------------------------------

    assessment = RiskEngine.evaluate(
        sender=sender,
        receiver=receiver,
        amount=req.amount,
        device=req.device,
        timestamp_str=req.timestamp,
        recent_tx_count=recent_tx_count,
        receiver_network_risk=receiver_network_risk,
        amount_history_available=amount_history_available,
    )

    # Save the deterministic rule score before optional ML.
    assessment.rule_score = assessment.score

    # --------------------------------------------------------------
    # Network score for explainability
    # --------------------------------------------------------------

    assessment.network_score = (
        100
        if receiver_network_risk
        else 0
    )

    # --------------------------------------------------------------
    # Optional benchmark model
    # --------------------------------------------------------------

    ml_probability = (
        benchmark_model.predict_probability(
            req.benchmark_features
        )
    )

    assessment.ml_score = ml_probability
    assessment.ml_available = (
        ml_probability is not None
    )

    # --------------------------------------------------------------
    # FINAL SCORE
    #
    # Rule engine is authoritative.
    #
    # If ML is available:
    #
    #     final = max(rule_score, ml_score)
    #
    # Therefore:
    #
    # strong deterministic fraud signal
    #     cannot be downgraded by an unrelated benchmark model.
    #
    # ML can still elevate a transaction.
    # --------------------------------------------------------------

    if ml_probability is not None:

        ml_score = (
            float(ml_probability) * 100.0
        )

        final_score = max(
            float(assessment.rule_score),
            ml_score,
        )

        (
            assessment.score,
            assessment.level,
            assessment.recommended_action,
        ) = RiskEngine.classify_score(
            final_score
        )

        assessment.final_score = (
            assessment.score
        )

        assessment.ai_narrative = (
            f"FinShield behavioral and network rules "
            f"produced {assessment.rule_score}/100. "
            f"The benchmark model estimated "
            f"{ml_probability:.3f} fraud probability "
            f"({ml_score:.1f}/100). "
            f"The final score uses the stronger signal: "
            f"{assessment.score}/100 "
            f"({assessment.level.value})."
        )

        assessment.data_source = (
            "FinShield Risk Engine "
            "+ Benchmark ML"
        )

    else:

        assessment.score = (
            float(assessment.rule_score)
        )

        (
            assessment.score,
            assessment.level,
            assessment.recommended_action,
        ) = RiskEngine.classify_score(
            assessment.score
        )

        assessment.final_score = (
            assessment.score
        )

        assessment.data_source = (
            "FinShield Behavioral + "
            "Network Risk Engine"
        )

    return assessment


# ----------------------------------------------------------------------
# Fraud network
# ----------------------------------------------------------------------

@app.get(
    "/api/network",
    response_model=Dict[str, Any],
)
def get_full_network():
    """
    Returns the complete Cytoscape-compatible fraud network.
    """

    return GraphEngine.build_network(
        db.accounts,
        db.transactions,
    )


@app.get(
    "/api/network/{account_id}",
    response_model=Dict[str, Any],
)
def get_account_subgraph(
    account_id: str,
):

    # In PostgreSQL mode the accounts dictionary contains only the
    # synthetic fallback state, so check PostgreSQL as well.
    account = db.get_account(
        account_id
    )

    if not account:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Account '{account_id}' "
                f"not found in network."
            ),
        )

    return GraphEngine.build_network(
        db.accounts,
        db.transactions,
        focus_account_id=account_id,
    )


# ----------------------------------------------------------------------
# Alerts
# ----------------------------------------------------------------------

@app.get(
    "/api/alerts",
    response_model=List[Alert],
)
def get_alerts():

    return db.get_alerts()


# ----------------------------------------------------------------------
# Attack simulator
# ----------------------------------------------------------------------

@app.post(
    "/api/simulate/{scenario}",
    response_model=SimulationResponse,
)
def run_simulation(
    scenario: str,
):
    """
    Supported scenarios:

    normal
    suspicious
    account_takeover
    fraud_ring
    """

    valid_scenarios = [
        "normal",
        "suspicious",
        "account_takeover",
        "fraud_ring",
    ]

    normalized_scenario = scenario.lower()

    if normalized_scenario not in valid_scenarios:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid scenario "
                f"'{scenario}'. "
                f"Valid options: "
                f"{valid_scenarios}"
            ),
        )

    return AttackSimulator.trigger(
        normalized_scenario
    )


# ----------------------------------------------------------------------
# Transaction defense actions
# ----------------------------------------------------------------------

@app.post(
    "/api/transactions/{transaction_id}/action",
    response_model=Transaction,
)
def perform_transaction_action(
    transaction_id: str,
    action_req: ActionRequest,
):

    tx = db.get_transaction(
        transaction_id
    )

    if not tx:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Transaction "
                f"'{transaction_id}' not found."
            ),
        )

    action_map = {
        "PAUSE": TransactionStatus.PAUSED,
        "VERIFY": TransactionStatus.VERIFICATION_REQUIRED,
        "PROCEED": TransactionStatus.APPROVED,
        "FREEZE": TransactionStatus.BLOCKED,
        "APPROVE": TransactionStatus.APPROVED,
        "BLOCK": TransactionStatus.BLOCKED,
    }

    action_upper = (
        action_req.action.upper()
    )

    if action_upper not in action_map:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported action "
                f"'{action_req.action}'."
            ),
        )

    target_status = action_map[
        action_upper
    ]

    updated_tx = db.update_transaction_status(
        transaction_id,
        target_status,
    )

    if not updated_tx:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Transaction "
                f"'{transaction_id}' "
                f"could not be updated."
            ),
        )

    if action_upper == "FREEZE":

        db.freeze_account(
            tx.sender_id
        )

    return updated_tx


# ----------------------------------------------------------------------
# Reset
# ----------------------------------------------------------------------

@app.post("/api/reset")
def reset_database():
    """
    Resets the synthetic in-memory demo state.

    PostgreSQL imported data is NOT deleted.
    """

    db.reset()

    return {
        "message": (
            "Synthetic demo state reset successfully. "
            "PostgreSQL data was not modified."
        )
    }