import unittest

from app.database import db


class PostgreSQLRiskIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if db._postgres_engine is None or not db._postgres_is_available():
            raise unittest.SkipTest("PostgreSQL transaction database is unavailable")

    def test_real_transactions_receive_risk_assessments(self):
        transactions = db.get_transactions(limit=20)
        self.assertGreaterEqual(len(transactions), 10)
        self.assertTrue(all(transaction.risk_assessment for transaction in transactions))
        self.assertTrue(all(transaction.device == "UNAVAILABLE" for transaction in transactions))
        self.assertTrue(all(0 <= transaction.risk_assessment.score <= 100 for transaction in transactions))

    def test_real_signal_examples(self):
        transaction = db.get_transaction("10")
        self.assertIsNotNone(transaction)
        assessment = transaction.risk_assessment
        self.assertIsNotNone(assessment)
        self.assertEqual(assessment.score, 65)
        self.assertEqual(assessment.level.value, "HIGH")
        self.assertEqual(
            {factor.name: factor.score_impact for factor in assessment.factors},
            {"New Beneficiary": 20, "High Velocity": 15, "Suspicious Network Connection": 30},
        )

    def test_fraud_label_is_preserved_separately(self):
        transactions = db.get_transactions(risk_level="FRAUD_LABELED", limit=5)
        self.assertGreater(len(transactions), 0)
        self.assertTrue(all(transaction.is_flagged for transaction in transactions))
        self.assertTrue(all(transaction.risk_assessment for transaction in transactions))

    def test_diagnostic_report(self):
        transactions = db.get_transactions(limit=10)
        for transaction in transactions:
            assessment = transaction.risk_assessment
            contributions = {factor.name: factor.score_impact for factor in assessment.factors}
            print(
                f"TX {transaction.id}: {transaction.sender_id}->{transaction.receiver_id} "
                f"amount={transaction.amount} score={assessment.score} level={assessment.level.value} "
                f"signals={contributions} fraud_label={transaction.is_flagged}"
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
