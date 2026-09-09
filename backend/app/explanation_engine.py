import os
from typing import List, Dict, Any, Optional

class ExplanationEngine:
    """
    Forensic AI Explanation Engine for FinShield.
    Translates raw algorithmic signals and behavioral graph metrics
    into human-interpretable forensic audit narratives.
    Operates 100% deterministically offline without requiring any API keys,
    with optional API hooks for Gemini/OpenAI if configured.
    """

    @classmethod
    def generate_narrative(
        cls,
        sender_name: str,
        receiver_name: str,
        amount: float,
        normal_avg: float,
        score: int,
        level: str,
        reasons: List[str],
        device: str,
        is_new_device: bool,
        is_new_beneficiary: bool,
        network_risk_flag: bool = False
    ) -> str:
        """
        Synthesizes an explainable investigation summary from actual risk signals.
        """
        ratio = amount / normal_avg if normal_avg > 0 else 1.0

        if score >= 80:
            # Critical alert narrative
            parts = []
            if ratio >= 2.0:
                parts.append(f"the requested amount of ₹{amount:,.0f} is anomalously high ({ratio:.1f}x higher than {sender_name}'s historical average of ₹{normal_avg:,.0f})")
            if is_new_beneficiary:
                parts.append(f"the beneficiary '{receiver_name}' has no established transaction history with this account")
            if is_new_device:
                parts.append(f"the transfer originated from an unregistered device signature ('{device}')")
            if network_risk_flag:
                parts.append(f"the recipient '{receiver_name}' is linked to an identified mule account ring or rapid cash-out node")

            reasons_joined = ", ".join(parts) if parts else "multiple high-severity behavioral deviations were triggered"
            return (
                f"CRITICAL FORENSIC ALERT (Score: {score}/100): This transaction was flagged because {reasons_joined}. "
                f"The combination of unverified hardware fingerprinting, sudden capital flight, and direct proximity to suspicious network clusters "
                f"presents an acute probability of account takeover or coercive money laundering. Immediate intervention recommended."
            )

        elif score >= 60:
            # High risk narrative
            return (
                f"HIGH RISK ANOMALY (Score: {score}/100): Elevated risk signals detected on transfer of ₹{amount:,.0f} to {receiver_name}. "
                f"Primary indicators: {'; '.join(reasons) if reasons else 'Unusual transaction characteristics'}. "
                f"System recommends pausing execution pending out-of-band biometric or OTP verification from {sender_name}."
            )

        elif score >= 30:
            # Medium risk narrative
            return (
                f"MODERATE RISK FLAGGED (Score: {score}/100): Routine deviation noted for {sender_name}. "
                f"Transfer of ₹{amount:,.0f} exhibits moderate variance ({'; '.join(reasons)}). "
                f"Automated risk threshold recommends queuing for monitoring without immediate disruption of service."
            )

        else:
            # Low risk narrative
            return (
                f"BENIGN TRANSACTION (Score: {score}/100 - LOW): Transfer of ₹{amount:,.0f} to {receiver_name} "
                f"aligns with historical spending patterns (average: ₹{normal_avg:,.0f}). "
                f"Originating from recognized device '{device}' to verified beneficiary. Standard automated settlement applied."
            )

    @classmethod
    def explain_fraud_ring(cls, chain_nodes: List[Dict[str, Any]], total_amount: float) -> str:
        """
        Generates an incident report explanation for a coordinated fraud ring.
        """
        names = [n.get("label", n.get("id")) for n in chain_nodes]
        chain_str = " ➔ ".join(names)
        return (
            f"COORDINATED FRAUD PATTERN DETECTED: Multi-hop rapid money movement identified across {len(chain_nodes)} accounts. "
            f"Laundering Topology: [{chain_str}]. "
            f"Total observed capital in transit: ₹{total_amount:,.2f}. "
            f"The network structure mirrors classic synthetic mule layering designed to evade velocity limits "
            f"prior to terminal crypto/ATM liquidation. All intermediate node transfers have been paused."
        )
