# PostgreSQL Risk Engine Diagnostic

## Root Cause

The PostgreSQL transaction path previously converted database rows directly into `Transaction` objects without calling `RiskEngine.evaluate()`. Consequently, `risk_assessment` was null and the frontend/API could not show rule-derived signals. The row adapter also supplied a fabricated `CSV_IMPORT` device value even though the dataset has no device column.

## Actual Database Fields

| Database field | Extracted feature | Risk signal | Contribution |
|---|---|---|---:|
| `sender_account_id`, `receiver_account_id`, historical transaction rows | Whether this sender/receiver pair appeared before the current transaction | `new_beneficiary` | +20 when no prior pair exists |
| No device column; `raw_features` is `{}` | Device telemetry unavailable | `new_device` | +0 and explicitly unavailable |
| `amount`, prior sender transactions | Average prior amount for the sender | `unusual_amount` | +25 when the existing rule threshold is exceeded |
| `event_time` is numeric elapsed time, not a wall-clock timestamp | Timing unavailable; no hour is inferred | `unusual_timing` | +0 and explicitly unavailable |
| `sender_account_id`, `event_time`, prior transaction IDs | Sender transactions in the preceding 600 seconds | `high_velocity` | +15 when at least 2 prior transactions exist |
| Receiver account `is_fraud` label | Receiver network-risk signal | `suspicious_network` | +30 when the receiver is fraud-labelled |

## Observed Real Rows

These values were produced by the same PostgreSQL adapter used by `/api/transactions` after feature integration.

| ID | Sender -> Receiver | Amount | Signals | Raw/final | Level |
|---:|---|---:|---|---:|---|
| 1 | 6456 -> 9069 | 465.05 | new beneficiary +20 | 20 / 20 | LOW |
| 7 | 7123 -> 9711 | 11.38 | new beneficiary +20, suspicious network +30 | 50 / 50 | MEDIUM |
| 8 | 7123 -> 4660 | 11.38 | new beneficiary +20, high velocity +15 | 35 / 35 | MEDIUM |
| 10 | 7123 -> 8957 | 11.38 | new beneficiary +20, high velocity +15, suspicious network +30 | 65 / 65 | HIGH |
| 20 | 6613 -> 9975 | 162.30 | new beneficiary +20, suspicious network +30 | 50 / 50 | MEDIUM |

The first 20 ordered rows did not include a CRITICAL scored transaction. Fraud-labelled rows are preserved separately through `is_flagged`; the source label is not silently converted into a risk score.

## Integration Rules

- Existing weights and thresholds are unchanged.
- Scores are produced by `RiskEngine.evaluate()` and remain clamped to `0-100`.
- Missing device telemetry is passed as `None`, so it does not create a false new-device signal.
- Numeric elapsed timestamps are not interpreted as clock hours.
- Beneficiary novelty and velocity are derived from PostgreSQL transaction history.
- Network risk is passed from the receiver account's observed fraud label. `GraphEngine` does not independently feed a score into this transaction assessment path.
