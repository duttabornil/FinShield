from datetime import datetime
import uuid
from typing import Dict, Any, List
from .models import Transaction, TransactionStatus, Alert, RiskLevel, SimulationResponse
from .database import db
from .risk_engine import RiskEngine
from .explanation_engine import ExplanationEngine

class AttackSimulator:
    """
    Simulates attack vectors and behavioral shifts for the FinShield Hackathon Demo.
    Scenarios:
    1. Normal Transaction (Benign baseline)
    2. Suspicious Transaction (92/100 risk score, ₹48,000 anomaly)
    3. Account Takeover (Hardware change + credential rotation + rapid drain)
    4. Coordinated Fraud Ring (Multi-hop mule chain expanding the graph)
    """

    @classmethod
    def trigger(cls, scenario: str) -> SimulationResponse:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if scenario == "normal":
            # Scenario 1: Normal routine transaction
            sender = db.accounts["ACC-VIC-101"]  # Ananya
            receiver = db.accounts["ACC-MERCH-401"]  # FreshBazaar
            amount = 1850.0
            device = sender.known_devices[0]

            assessment = RiskEngine.evaluate(
                sender=sender,
                receiver=receiver,
                amount=amount,
                device=device,
                timestamp_str=now_str
            )

            tx_id = f"TXN-LIVE-{str(uuid.uuid4())[:6].upper()}"
            tx = Transaction(
                id=tx_id,
                sender_id=sender.id,
                sender_name=sender.name,
                receiver_id=receiver.id,
                receiver_name=receiver.name,
                amount=amount,
                timestamp=now_str,
                device=device,
                status=TransactionStatus.PROCESSED,
                risk_assessment=assessment,
                is_flagged=False,
                scenario_tag="normal_sim"
            )
            db.add_transaction(tx)

            return SimulationResponse(
                scenario="normal",
                title="Routine Transaction Executed",
                message=f"Simulated normal purchase of ₹{amount:,.0f} by {sender.name} at {receiver.name}. Risk Score: {assessment.score}/100 (LOW).",
                status="SUCCESS",
                transaction=tx,
                alert=None,
                highlight_nodes=[sender.id, receiver.id],
                graph_update=True
            )

        elif scenario == "suspicious":
            # Scenario 2: Suspicious Transaction (₹48,000, 92/100 risk score)
            sender = db.accounts["ACC-VIC-101"]  # Ananya (avg: ₹5,800)
            receiver = db.accounts["ACC-MULE-201"]  # Rohan Verma (Mule)
            amount = 48000.0
            device = "Unrecognized iPhone 15 Pro Max (Hong Kong IP)"

            assessment = RiskEngine.evaluate(
                sender=sender,
                receiver=receiver,
                amount=amount,
                device=device,
                timestamp_str="02:30:00",
                recent_tx_count=1,
                receiver_network_risk=True
            )
            # Ensure exact 92/100 score as required by demo spec
            assessment.score = 92
            assessment.level = RiskLevel.CRITICAL
            assessment.recommended_action = "PAUSE & STEP-UP VERIFICATION - Require instant biometric or OTP challenge."
            assessment.ai_narrative = (
                "This transaction was flagged because the amount (₹48,000) is significantly above normal behavior "
                "(historical average: ₹5,800), the beneficiary 'Rohan Verma' is new, the device fingerprint is unfamiliar, "
                "and the beneficiary is connected to known suspicious mule accounts."
            )

            tx_id = f"TXN-LIVE-{str(uuid.uuid4())[:6].upper()}"
            tx = Transaction(
                id=tx_id,
                sender_id=sender.id,
                sender_name=sender.name,
                receiver_id=receiver.id,
                receiver_name=receiver.name,
                amount=amount,
                timestamp=now_str,
                device=device,
                status=TransactionStatus.PAUSED,
                risk_assessment=assessment,
                is_flagged=True,
                scenario_tag="suspicious_tx"
            )
            db.add_transaction(tx)

            # Generate Alert
            alert_id = f"ALT-LIVE-{str(uuid.uuid4())[:5].upper()}"
            alert = Alert(
                id=alert_id,
                timestamp=now_str,
                risk_level=RiskLevel.CRITICAL,
                risk_score=92,
                title="Critical Behavioral Deviation Flagged",
                transaction_id=tx.id,
                account_id=sender.id,
                account_name=sender.name,
                amount=amount,
                reason="Unusual amount (8.3x baseline), new beneficiary, untrusted device, mule link.",
                recommended_action="PAUSE TRANSACTION & INITIATE STEP-UP VERIFICATION",
                status="ACTIVE"
            )
            db.add_alert(alert)

            return SimulationResponse(
                scenario="suspicious",
                title="Suspicious Transaction Intercepted",
                message="High-risk anomaly detected: ₹48,000 transfer intercepted with Risk Score 92/100 (CRITICAL).",
                status="FLAGGED",
                transaction=tx,
                alert=alert,
                highlight_nodes=[sender.id, receiver.id],
                graph_update=True
            )

        elif scenario == "account_takeover":
            # Scenario 3: Account Takeover
            sender = db.accounts["ACC-VIC-102"]  # Rajesh Iyer (avg: ₹8,200)
            receiver = db.accounts["ACC-MULE-204"]  # Devendra Yadav (Mule)
            amount = 95000.0
            device = "Unknown Linux Tor Gateway (Node 185.220.101)"

            assessment = RiskEngine.evaluate(
                sender=sender,
                receiver=receiver,
                amount=amount,
                device=device,
                timestamp_str="03:15:00",
                recent_tx_count=3,
                receiver_network_risk=True
            )
            assessment.score = 98
            assessment.level = RiskLevel.CRITICAL
            assessment.recommended_action = "BLOCK & FREEZE - Account compromise signature detected."
            assessment.ai_narrative = (
                "ACCOUNT TAKEOVER CONFIRMED: Foreign IP/device signature accessed account during off-hours, "
                "attempting an unprecedented ₹95,000 capital drain (11.6x average) to high-risk mule node."
            )

            tx_id = f"TXN-LIVE-{str(uuid.uuid4())[:6].upper()}"
            tx = Transaction(
                id=tx_id,
                sender_id=sender.id,
                sender_name=sender.name,
                receiver_id=receiver.id,
                receiver_name=receiver.name,
                amount=amount,
                timestamp=now_str,
                device=device,
                status=TransactionStatus.BLOCKED,
                risk_assessment=assessment,
                is_flagged=True,
                scenario_tag="account_takeover"
            )
            db.add_transaction(tx)

            alert_id = f"ALT-LIVE-{str(uuid.uuid4())[:5].upper()}"
            alert = Alert(
                id=alert_id,
                timestamp=now_str,
                risk_level=RiskLevel.CRITICAL,
                risk_score=98,
                title="High-Confidence Account Takeover (ATO) In Progress",
                transaction_id=tx.id,
                account_id=sender.id,
                account_name=sender.name,
                amount=amount,
                reason="Severe telemetry anomaly: Unregistered Tor device attempting drain of ₹95,000.",
                recommended_action="IMMEDIATE ACCOUNT FREEZE & RE-AUTHENTICATION REQUIRED",
                status="ACTIVE"
            )
            db.add_alert(alert)

            return SimulationResponse(
                scenario="account_takeover",
                title="Account Takeover Intercepted",
                message="Severe ATO attempt blocked. Account access isolated to protect customer funds.",
                status="BLOCKED",
                transaction=tx,
                alert=alert,
                highlight_nodes=[sender.id, receiver.id],
                graph_update=True
            )

        elif scenario == "fraud_ring":
            # Scenario 4: Coordinated Fraud Ring
            # Injects / activates rapid multi-hop mule layering
            mule_a = db.accounts["ACC-MULE-201"]
            mule_b = db.accounts["ACC-MULE-202"]
            mule_c = db.accounts["ACC-MULE-203"]
            cashout = db.accounts["ACC-CASH-999"]
            victim = db.accounts["ACC-VIC-101"]

            # Add fresh active ring transactions to simulate live burst
            tx_ring_1 = Transaction(
                id=f"TXN-RING-A{str(uuid.uuid4())[:4].upper()}",
                sender_id=victim.id,
                sender_name=victim.name,
                receiver_id=mule_a.id,
                receiver_name=mule_a.name,
                amount=60000.0,
                timestamp=now_str,
                device="Rogue Browser Instance",
                status=TransactionStatus.PAUSED,
                risk_assessment=RiskEngine.evaluate(victim, mule_a, 60000.0, "Rogue Browser", now_str, 2, True),
                is_flagged=True,
                scenario_tag="fraud_ring"
            )
            tx_ring_2 = Transaction(
                id=f"TXN-RING-B{str(uuid.uuid4())[:4].upper()}",
                sender_id=mule_a.id,
                sender_name=mule_a.name,
                receiver_id=mule_b.id,
                receiver_name=mule_b.name,
                amount=58500.0,
                timestamp=now_str,
                device="Redmi Note 12",
                status=TransactionStatus.PAUSED,
                risk_assessment=RiskEngine.evaluate(mule_a, mule_b, 58500.0, "Redmi Note 12", now_str, 2, True),
                is_flagged=True,
                scenario_tag="fraud_ring"
            )
            tx_ring_3 = Transaction(
                id=f"TXN-RING-C{str(uuid.uuid4())[:4].upper()}",
                sender_id=mule_b.id,
                sender_name=mule_b.name,
                receiver_id=mule_c.id,
                receiver_name=mule_c.name,
                amount=57000.0,
                timestamp=now_str,
                device="Realme 9",
                status=TransactionStatus.PAUSED,
                risk_assessment=RiskEngine.evaluate(mule_b, mule_c, 57000.0, "Realme 9", now_str, 2, True),
                is_flagged=True,
                scenario_tag="fraud_ring"
            )
            tx_ring_4 = Transaction(
                id=f"TXN-RING-D{str(uuid.uuid4())[:4].upper()}",
                sender_id=mule_c.id,
                sender_name=mule_c.name,
                receiver_id=cashout.id,
                receiver_name=cashout.name,
                amount=55000.0,
                timestamp=now_str,
                device="Vivo V27",
                status=TransactionStatus.BLOCKED,
                risk_assessment=RiskEngine.evaluate(mule_c, cashout, 55000.0, "Vivo V27", now_str, 3, True),
                is_flagged=True,
                scenario_tag="fraud_ring"
            )

            db.add_transaction(tx_ring_4)
            db.add_transaction(tx_ring_3)
            db.add_transaction(tx_ring_2)
            db.add_transaction(tx_ring_1)

            # Generate ring alert
            alert = Alert(
                id=f"ALT-RING-{str(uuid.uuid4())[:5].upper()}",
                timestamp=now_str,
                risk_level=RiskLevel.CRITICAL,
                risk_score=99,
                title="COORDINATED FRAUD PATTERN DETECTED",
                transaction_id=tx_ring_4.id,
                account_id=victim.id,
                account_name=victim.name,
                amount=60000.0,
                reason="Coordinated 4-hop mule chain actively attempting layered liquidation to Apex Crypto Hub.",
                recommended_action="FREEZE MULTI-ACCOUNT CASCADE & QUARANTINE ROUTE",
                status="ACTIVE"
            )
            db.add_alert(alert)

            mule_chain_ids = [victim.id, mule_a.id, mule_b.id, mule_c.id, cashout.id]

            return SimulationResponse(
                scenario="fraud_ring",
                title="COORDINATED FRAUD PATTERN DETECTED",
                message=(
                    "SYNTHETIC ATTACK INJECTED: 4-hop coordinated mule ring identified. "
                    "Flow: Ananya Sharma (Victim) ➔ Rohan Verma (Mule A) ➔ Vikram Singh (Mule B) ➔ Amit Patel (Mule C) ➔ Apex Crypto Hub."
                ),
                status="COORDINATED_FRAUD_DETECTED",
                transaction=tx_ring_1,
                alert=alert,
                highlight_nodes=mule_chain_ids,
                mule_chain=mule_chain_ids,
                graph_update=True
            )

        else:
            raise ValueError(f"Unknown scenario: {scenario}")
