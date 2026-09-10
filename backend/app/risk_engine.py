from datetime import datetime
from typing import List, Optional, Tuple

from .models import RiskAssessment, RiskLevel, RiskFactor, Account


class RiskEngine:
    """
    FinShield Behavioral Risk Engine.

    Explainable rule-based scoring for the prototype.

    The engine intentionally does NOT use the dataset's IS_FRAUD label
    as an input to the prediction score. That label is ground truth
    and should only be used for evaluation/validation.

    Signals:
        New Beneficiary       +20
        New Device            +15
        Unusual Amount        +25
        Unusual Timing        +10
        High Velocity         +15
        Suspicious Network    +30

    Maximum raw score = 115.
    Final score is capped at 100.

    Risk tiers:
        0-29   LOW
        30-59  MEDIUM
        60-79  HIGH
        80-100 CRITICAL
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
    def classify_score(
        cls,
        score: float
    ) -> Tuple[int, RiskLevel, str]:
        """
        Normalize score, clamp to 0-100, then classify it.

        The risk level is ALWAYS derived from the final normalized score.
        """

        try:
            normalized_score = int(round(float(score)))
        except (TypeError, ValueError):
            normalized_score = 0

        normalized_score = max(
            0,
            min(100, normalized_score)
        )

        if normalized_score <= 29:
            return (
                normalized_score,
                RiskLevel.LOW,
                "PROCEED - Transaction within normal risk parameters."
            )

        if normalized_score <= 59:
            return (
                normalized_score,
                RiskLevel.MEDIUM,
                "FLAG FOR MONITORING - Elevated risk markers detected. Queue for soft review."
            )

        if normalized_score <= 79:
            return (
                normalized_score,
                RiskLevel.HIGH,
                "PAUSE & STEP-UP VERIFICATION - Require instant biometric or out-of-band OTP challenge."
            )

        return (
            normalized_score,
            RiskLevel.CRITICAL,
            "IMMEDIATE INTERVENTION - Block transaction and freeze downstream transfer route."
        )

    @staticmethod
    def _parse_hour(timestamp_str: Optional[str]) -> int:
        """
        Extract hour from several supported timestamp formats.

        Supported:
            HH:MM:SS
            YYYY-MM-DD HH:MM:SS
            YYYY-MM-DDTHH:MM:SS
            ISO timestamps with timezone

        If parsing fails, use 14:00 as a neutral daytime default.
        """

        default_hour = 14

        if not timestamp_str:
            return default_hour

        value = str(timestamp_str).strip()

        if not value:
            return default_hour

        try:
            # Plain time string: 02:30:00
            if ":" in value and "T" not in value and " " not in value:
                return int(value.split(":")[0])

            # ISO / datetime string
            if "T" in value or " " in value:
                normalized = value.replace("Z", "+00:00")
                dt = datetime.fromisoformat(normalized)
                return dt.hour

        except (ValueError, TypeError, OverflowError):
            return default_hour

        return default_hour

    @classmethod
    def evaluate(
        cls,
        sender: Account,
        receiver: Account,
        amount: float,
        device: Optional[str],
        timestamp_str: Optional[str] = None,
        recent_tx_count: int = 0,
        receiver_network_risk: bool = False,
        amount_history_available: bool = True
    ) -> RiskAssessment:
        """
        Evaluate a transaction using explainable behavioral/network signals.
        """

        score = 0

        reasons: List[str] = []
        factors: List[RiskFactor] = []

        # ---------------------------------------------------------
        # Normalize inputs
        # ---------------------------------------------------------

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            amount = 0.0

        try:
            recent_tx_count = int(recent_tx_count)
        except (TypeError, ValueError):
            recent_tx_count = 0

        recent_tx_count = max(0, recent_tx_count)

        # ---------------------------------------------------------
        # 1. NEW BENEFICIARY +20
        # ---------------------------------------------------------

        known_beneficiaries = sender.known_beneficiaries or []

        is_new_beneficiary = (
            receiver.id not in known_beneficiaries
        )

        if is_new_beneficiary:
            pts = cls.SCORING_WEIGHTS["new_beneficiary"]

            score += pts

            reasons.append(
                "New beneficiary not previously transferred to"
            )

            factors.append(
                RiskFactor(
                    name="New Beneficiary",
                    score_impact=pts,
                    description=(
                        f"Receiver {receiver.name} "
                        f"({receiver.account_number}) is not in "
                        f"sender's trusted beneficiary history."
                    )
                )
            )

        # ---------------------------------------------------------
        # 2. NEW DEVICE +15
        # ---------------------------------------------------------

        known_devices = sender.known_devices or []

        is_new_device = (
            bool(device)
            and str(device) not in known_devices
        )

        if is_new_device:
            pts = cls.SCORING_WEIGHTS["new_device"]

            score += pts

            reasons.append(
                "Unrecognized device fingerprint"
            )

            factors.append(
                RiskFactor(
                    name="New Device",
                    score_impact=pts,
                    description=(
                        f"Transaction originated from '{device}', "
                        "which is not present in the account's "
                        "known device history."
                    )
                )
            )

        # ---------------------------------------------------------
        # 3. UNUSUAL AMOUNT +25
        # ---------------------------------------------------------

        try:
            avg_amt = float(
                sender.avg_transaction_amount or 0.0
            )
        except (TypeError, ValueError):
            avg_amt = 0.0

        is_unusual_amount = False

        if amount_history_available and avg_amt > 0:

            ratio = amount / avg_amt

            # Strong relative anomaly
            if ratio >= 2.5:
                is_unusual_amount = True

            # Strong absolute anomaly for low-value accounts
            elif amount >= 30000.0 and avg_amt <= 8000.0:
                is_unusual_amount = True

        if is_unusual_amount:

            pts = cls.SCORING_WEIGHTS["unusual_amount"]

            score += pts

            ratio = (
                amount / avg_amt
                if avg_amt > 0
                else 1.0
            )

            reasons.append(
                f"Unusual transaction amount "
                f"({ratio:.1f}x higher than historical baseline)"
            )

            factors.append(
                RiskFactor(
                    name="Unusual Amount",
                    score_impact=pts,
                    description=(
                        f"Attempted amount ₹{amount:,.2f} "
                        f"is significantly above the historical "
                        f"baseline of ₹{avg_amt:,.2f}."
                    )
                )
            )

        # ---------------------------------------------------------
        # 4. UNUSUAL TIMING +10
        # ---------------------------------------------------------

        hour = cls._parse_hour(timestamp_str)

        is_unusual_timing = (
            1 <= hour <= 5
        )

        if is_unusual_timing:

            pts = cls.SCORING_WEIGHTS["unusual_timing"]

            score += pts

            reasons.append(
                f"High-risk transfer window "
                f"(executed at {hour:02d}:00 off-peak hours)"
            )

            factors.append(
                RiskFactor(
                    name="Unusual Timing",
                    score_impact=pts,
                    description=(
                        f"Transaction occurred at approximately "
                        f"{hour:02d}:00 during the configured "
                        "off-peak monitoring window."
                    )
                )
            )

        # ---------------------------------------------------------
        # 5. HIGH VELOCITY +15
        # ---------------------------------------------------------

        if recent_tx_count >= 2:

            pts = cls.SCORING_WEIGHTS["high_velocity"]

            score += pts

            reasons.append(
                f"Rapid burst velocity "
                f"({recent_tx_count} transfers in past 10 minutes)"
            )

            factors.append(
                RiskFactor(
                    name="High Velocity",
                    score_impact=pts,
                    description=(
                        f"{recent_tx_count} outgoing transfers "
                        "were observed within the configured "
                        "10-minute window."
                    )
                )
            )

        # ---------------------------------------------------------
        # 6. SUSPICIOUS NETWORK +30
        # ---------------------------------------------------------

        receiver_type = str(
            receiver.type or ""
        ).upper()

        try:
            receiver_risk_score = float(
                receiver.risk_score or 0
            )
        except (TypeError, ValueError):
            receiver_risk_score = 0.0

        is_suspicious_conn = (
            bool(receiver_network_risk)
            or receiver_type in {
                "SUSPECTED_MULE",
                "CONFIRMED_MULE",
                "CASHOUT_POINT",
            }
            or receiver_risk_score >= 65
        )

        if is_suspicious_conn:

            pts = cls.SCORING_WEIGHTS["suspicious_network"]

            score += pts

            reasons.append(
                f"Direct connection to flagged "
                f"mule/high-risk entity ({receiver.name})"
            )

            factors.append(
                RiskFactor(
                    name="Suspicious Network Connection",
                    score_impact=pts,
                    description=(
                        "Beneficiary account is associated with "
                        "a suspicious network, flagged account, "
                        "or elevated network risk context."
                    )
                )
            )

        # ---------------------------------------------------------
        # FINAL SCORE
        # ---------------------------------------------------------

        final_score, level, recommended_action = (
            cls.classify_score(score)
        )

        # ---------------------------------------------------------
        # EXPLAINABLE NARRATIVE
        # ---------------------------------------------------------

        if reasons:

            reasons_summary = ", ".join(
                reasons
            )

            if level == RiskLevel.CRITICAL:
                severity_text = "Critical-risk indicators"
            elif level == RiskLevel.HIGH:
                severity_text = "High-risk indicators"
            elif level == RiskLevel.MEDIUM:
                severity_text = "Elevated-risk indicators"
            else:
                severity_text = "Low-risk indicators"

            narrative = (
                f"This transaction has been scored at "
                f"{final_score}/100 ({level.value}) by the "
                "FinShield prototype risk engine. "
                f"{severity_text} detected: "
                f"{reasons_summary}. "
                f"Historical baseline comparison indicates "
                f"an average transfer of ₹{avg_amt:,.2f} "
                f"versus the current ₹{amount:,.2f}."
            )

        else:

            narrative = (
                f"Transaction scored at "
                f"{final_score}/100 ({level.value}). "
                f"Sender {sender.name} is transacting within "
                f"regular historical baseline limits "
                f"(₹{amount:,.2f} vs average "
                f"₹{avg_amt:,.2f})."
                + (
                    f" Device '{device}' is present."
                    if device
                    else " Device telemetry is unavailable."
                )
            )

        # ---------------------------------------------------------
        # RETURN ASSESSMENT
        # ---------------------------------------------------------

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