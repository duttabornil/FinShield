import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.models import RiskLevel, TransactionStatus
from app.database import db
from app.risk_engine import RiskEngine
from app.graph_engine import GraphEngine
from app.simulator import AttackSimulator

print("Testing FinShield Backend...")

# 1. Test database initialization
stats = db.get_dashboard_stats()
print(f"Stats: {stats.total_transactions} txs, {stats.high_risk_transactions} high risk, {stats.suspicious_accounts} suspicious accounts")
assert stats.total_transactions >= 50, "Expected at least 50 transactions"
assert stats.suspicious_accounts >= 4, "Expected at least 4 suspicious accounts"

# 2. Test risk engine logic
sender = db.accounts["ACC-VIC-101"] # avg 5800
receiver = db.accounts["ACC-MULE-201"] # mule
eval_res = RiskEngine.evaluate(
    sender=sender,
    receiver=receiver,
    amount=48000.0,
    device="Unknown iPhone 15",
    timestamp_str="02:30:00",
    recent_tx_count=1,
    receiver_network_risk=True
)
print(f"Risk evaluation for ₹48,000 to mule: Score={eval_res.score}, Level={eval_res.level.value}")
assert eval_res.score >= 80, f"Expected critical score, got {eval_res.score}"
assert eval_res.level == RiskLevel.CRITICAL, f"Expected CRITICAL level, got {eval_res.level.value}"
assert eval_res.is_new_beneficiary is True
assert eval_res.is_new_device is True

# 3. Test Graph Engine
net = GraphEngine.build_network(db.accounts, db.transactions)
print(f"Graph nodes: {len(net['nodes'])}, edges: {len(net['edges'])}, mule chains: {len(net['mule_chains'])}")
assert len(net['nodes']) >= 20, "Expected >= 20 nodes"
assert len(net['edges']) >= 40, "Expected >= 40 edges"
assert len(net['mule_chains']) >= 1, "Expected at least 1 detected mule chain"
print("Mule chain 1:", net['mule_chains'][0])

# 4. Test Attack Simulator
sim_res = AttackSimulator.trigger("suspicious")
print(f"Simulator 'suspicious': {sim_res.title}, Score: {sim_res.transaction.risk_assessment.score}")
assert sim_res.transaction.risk_assessment.level == RiskLevel.CRITICAL
assert sim_res.transaction.risk_assessment.score >= 80

ring_res = AttackSimulator.trigger("fraud_ring")
print(f"Simulator 'fraud_ring': {ring_res.title}, Chain: {ring_res.mule_chain}")
assert ring_res.status == "COORDINATED_FRAUD_DETECTED"
assert len(ring_res.mule_chain) >= 4

print("ALL BACKEND TESTS PASSED SUCCESSFULLY!")
