from datetime import datetime
from typing import Dict, Any, List, Optional
from .models import RiskAssessment, RiskLevel, RiskFactor, Account

class RiskEngine:
    """
    FinShield Behavioral Risk Engine (Prototype Rule-Based Scoring).
    Calculates explainable risk scores based on fintech behavioral signals.
    """

    SCORING_WEIGHTS = {
        "new_beneficiary": 20,
        "new_device": 15,
        "unusual_amount": 25,
        "unusual_timing": 10,
        "high_velocity": 15,
        "suspicious_network": 30,
    }

    @classmethod
    def evaluate(
        cls,
        sender: Account,
        receiver: Account,
        amount: float,
        device: str,
        timestamp_str: Optional[str] = None,
        recent_tx_count: int = 0,
        receiver_network_risk: bool = False
    ) -> RiskAssessment:
        score = 0
        reasons: List[str] = []
        factors: List[RiskFactor] = []

        # 1. New Beneficiary (+20)
        is_new_beneficiary = receiver.id not in sender.known_beneficiaries
        if is_new_beneficiary:
            pts = cls.SCORING_WEIGHTS["new_beneficiary"]
            score += pts
            reasons.append("New beneficiary not previously transferred to")
            factors.append(RiskFactor(
                name="New Beneficiary",
                score_impact=pts,
                description=f"Receiver {receiver.name} ({receiver.account_number}) is not in sender's trusted list."
            ))

        # 2. New Device (+15)
        is_new_device = device not in sender.known_devices
        if is_new_device:
            pts = cls.SCORING_WEIGHTS["new_device"]
            score += pts
            reasons.append("Unrecognized device fingerprint")
            factors.append(RiskFactor(
                name="New Device",
                score_impact=pts,
                description=f"Transaction originated from '{device}', which has never been registered by this account."
            ))

        # 3. Unusual Amount (+25)
        avg_amt = sender.avg_transaction_amount or 5000.0
        is_unusual_amount = amount >= (2.5 * avg_amt) or (amount >= 30000.0 and avg_amt <= 8000.0)
        if is_unusual_amount:
            pts = cls.SCORING_WEIGHTS["unusual_amount"]
            score += pts
            ratio = amount / avg_amt if avg_amt > 0 else 1.0
            reasons.append(f"Unusual transaction amount ({ratio:.1f}x higher than historical baseline)")
            factors.append(RiskFactor(
                name="Unusual Amount",
                score_impact=pts,
                description=f"Attempted amount ₹{amount:,.2f} is significantly above average baseline of ₹{avg_amt:,.2f}."
            ))

        # 4. Unusual Timing (+10)
        is_unusual_timing = False
        hour = 14 # default
        if timestamp_str:
            try:
                # Handle ISO timestamps or time strings
                if "T" in timestamp_str:
                    dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                    hour = dt.hour
                elif ":" in timestamp_str:
                    hour = int(timestamp_str.split(":")[0])
            except Exception:
                hour = 14
        
        # Late night anomaly between 01:00 and 05:00
        if 1 <= hour <= 5:
            is_unusual_timing = True
            pts = cls.SCORING_WEIGHTS["unusual_timing"]
            score += pts
            reasons.append(f"High-risk transfer window (executed at {hour:02d}:00 off-peak hours)")
            factors.append(RiskFactor(
                name="Unusual Timing",
                score_impact=pts,
                description=f"Executed during dormitive off-peak hours ({hour:02d}:00 hrs), standard indicator of unauthorized drainage."
            ))

        # 5. High Transaction Velocity (+15)
        if recent_tx_count >= 2:
            pts = cls.SCORING_WEIGHTS["high_velocity"]
            score += pts
            reasons.append(f"Rapid burst velocity ({recent_tx_count} transfers in past 10 minutes)")
            factors.append(RiskFactor(
                name="High Velocity",
                score_impact=pts,
                description=f"Multiple rapid consecutive transfers ({recent_tx_count}) observed within short timeframe."
            ))

        # 6. Suspicious Network Connection (+30)
        is_suspicious_conn = (
            receiver_network_risk or
            receiver.type in ["SUSPECTED_MULE", "CONFIRMED_MULE", "CASHOUT_POINT"] or
            receiver.risk_score >= 65
        )
        if is_suspicious_conn:
            pts = cls.SCORING_WEIGHTS["suspicious_network"]
            score += pts
            reasons.append(f"Direct connection to flagged mule/high-risk entity ({receiver.name})")
            factors.append(RiskFactor(
                name="Suspicious Network Connection",
                score_impact=pts,
                description=f"Beneficiary account exhibits prior links to mule network or high risk cluster."
            ))

        # Cap score at 100
        final_score = min(score, 100)

        # Categorize risk level
        if final_score <= 29:
            level = RiskLevel.LOW
            recommended_action = "PROCEED - Transaction within normal risk parameters."
        elif final_score <= 59:
            level = RiskLevel.MEDIUM
            recommended_action = "FLAG FOR MONITORING - Elevated risk markers detected. Queue for soft review."
        elif final_score <= 79:
            level = RiskLevel.HIGH
            recommended_action = "PAUSE & STEP-UP VERIFICATION - Require instant biometric or out-of-band OTP challenge."
        else:
            level = RiskLevel.CRITICAL
            recommended_action = "IMMEDIATE INTERVENTION - Block transaction and freeze downstream transfer route."

        # Human-readable AI narrative synthesis
        if reasons:
            reasons_summary = ", ".join(reasons).lower()
            narrative = (
                f"This transaction has been scored at {final_score}/100 ({level.value}) by the prototype risk engine. "
                f"Critical risk indicators were triggered because {reasons_summary}. "
                f"Historical baseline comparison indicates average transfer of ₹{avg_amt:,.2f} versus current ₹{amount:,.2f}."
            )
        else:
            narrative = (
                f"Transaction scored at {final_score}/100 ({level.value}). "
                f"Sender {sender.name} is transacting within regular historical baseline limits "
                f"(₹{amount:,.2f} vs avg ₹{avg_amt:,.2f}) using trusted device '{device}'."
            )

        return RiskAssessment(
            score=final_score,
            level=level,
            reasons=reasons,
            factors=factors,
            recommended_action=recommended_action,
            normal_avg_amount=avg_amt,
            is_new_beneficiary=is_new_beneficiary,
            is_new_device=is_new_device,
            ai_narrative=narrative
        )
