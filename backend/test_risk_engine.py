import unittest

from app.data_generator import DataGenerator
from app.models import Account, AccountType, RiskLevel
from app.risk_engine import RiskEngine
from app.simulator import AttackSimulator
from app.database import db


class RiskEngineMatrixTests(unittest.TestCase):
    @staticmethod
    def account(account_id, *, account_type=AccountType.REGULAR, risk_score=0, beneficiaries=None, devices=None):
        return Account(
            id=account_id,
            name=account_id,
            account_number=account_id,
            type=account_type,
            risk_score=risk_score,
            balance=100000.0,
            avg_transaction_amount=1000.0,
            known_devices=devices or ["trusted-device"],
            known_beneficiaries=beneficiaries or [],
            created_date="2024-01-01T00:00:00Z",
        )

    def setUp(self):
        self.sender = self.account("sender", beneficiaries=["receiver"])
        self.receiver = self.account("receiver")

    def evaluate(self, **overrides):
        values = {
            "sender": self.sender,
            "receiver": self.receiver,
            "amount": 1000.0,
            "device": "trusted-device",
            "timestamp_str": "14:00:00",
            "recent_tx_count": 0,
            "receiver_network_risk": False,
        }
        values.update(overrides)
        return RiskEngine.evaluate(**values)

    def assert_level(self, name, expected_level, expected_score_range, **signals):
        result = self.evaluate(**signals)
        factor_points = {factor.name: factor.score_impact for factor in result.factors}
        signal_names = [
            "New Beneficiary",
            "New Device",
            "Unusual Amount",
            "Unusual Timing",
            "High Velocity",
            "Suspicious Network Connection",
        ]
        raw_score = sum(factor_points.values())
        print(f"Transaction: {name}")
        print("Signals:")
        for signal_name in signal_names:
            print(f"{signal_name}: +{factor_points.get(signal_name, 0)}")
        print(f"Raw score: {raw_score}")
        print(f"Capped score: {result.score}")
        print(f"Risk level: {result.level.value}")
        self.assertEqual(result.level, expected_level)
        self.assertIn(result.score, expected_score_range)
        self.assertGreaterEqual(result.score, 0)
        self.assertLessEqual(result.score, 100)
        return result

    def test_threshold_boundaries(self):
        expected = {
            29: RiskLevel.LOW,
            30: RiskLevel.MEDIUM,
            59: RiskLevel.MEDIUM,
            60: RiskLevel.HIGH,
            79: RiskLevel.HIGH,
            80: RiskLevel.CRITICAL,
            100: RiskLevel.CRITICAL,
        }
        for score, level in expected.items():
            normalized, actual_level, _ = RiskEngine.classify_score(score)
            self.assertEqual(normalized, score)
            self.assertEqual(actual_level, level)

    def test_controlled_low_medium_high_critical_matrix(self):
        self.assert_level("TEST-LOW-001", RiskLevel.LOW, range(0, 30))
        self.assert_level("TEST-MEDIUM-001", RiskLevel.MEDIUM, range(30, 60), receiver=self.account("new-receiver"), device="new-device")
        self.assert_level("TEST-HIGH-001", RiskLevel.HIGH, range(60, 80), receiver=self.account("new-receiver"), device="new-device", amount=3000.0)
        critical = self.assert_level(
            "TEST-CRITICAL-001",
            RiskLevel.CRITICAL,
            range(80, 101),
            receiver=self.account("new-receiver"),
            device="new-device",
            amount=3000.0,
            timestamp_str="02:00:00",
            recent_tx_count=2,
            receiver_network_risk=True,
        )
        self.assertEqual(critical.score, 100)

    def test_individual_signal_weights(self):
        cases = [
            ("new_beneficiary", {"receiver": self.account("new-receiver")}, 20),
            ("new_device", {"device": "new-device"}, 15),
            ("unusual_amount", {"amount": 3000.0}, 25),
            ("unusual_timing", {"timestamp_str": "02:00:00"}, 10),
            ("high_velocity", {"recent_tx_count": 2}, 15),
            ("suspicious_network", {"receiver_network_risk": True}, 30),
        ]
        for name, signals, expected_score in cases:
            result = self.evaluate(**signals)
            self.assertEqual(result.score, expected_score, name)
            self.assertEqual(len(result.factors), 1, name)
            self.assertEqual(result.factors[0].score_impact, expected_score, name)

    def test_space_separated_off_hours_timestamp(self):
        result = self.evaluate(timestamp_str="2026-09-10 02:00:00")
        self.assertEqual(result.score, 10)
        self.assertIn("Unusual Timing", result.factors[0].name)

    def test_score_is_clamped_and_level_comes_from_final_score(self):
        normalized, level, _ = RiskEngine.classify_score(115)
        self.assertEqual((normalized, level), (100, RiskLevel.CRITICAL))
        normalized, level, _ = RiskEngine.classify_score(-10)
        self.assertEqual((normalized, level), (0, RiskLevel.LOW))

    def test_simulator_scenarios_use_engine_scores(self):
        db.accounts, db.transactions, db.alerts = DataGenerator.generate_initial_dataset()
        scenarios = {
            "normal": RiskLevel.LOW,
            "suspicious": RiskLevel.CRITICAL,
            "account_takeover": RiskLevel.CRITICAL,
            "fraud_ring": RiskLevel.CRITICAL,
        }
        for scenario, expected_level in scenarios.items():
            result = AttackSimulator.trigger(scenario)
            assessment = result.transaction.risk_assessment
            self.assertIsNotNone(assessment)
            self.assertEqual(assessment.level, expected_level, scenario)
            self.assertEqual(assessment.score, RiskEngine.classify_score(assessment.score)[0], scenario)
            print(f"{scenario}: score={assessment.score}, level={assessment.level.value}")

        ring_scores = [
            transaction.risk_assessment.score
            for transaction in db.transactions
            if transaction.scenario_tag == "fraud_ring"
        ]
        self.assertEqual(len(ring_scores), 4)
        self.assertTrue(all(score >= 80 for score in ring_scores))


if __name__ == "__main__":
    unittest.main(verbosity=2)
