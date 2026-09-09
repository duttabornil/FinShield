# FinShield Dataset Inventory

This inventory is based on the files currently present under `data/raw`. The repository contains public benchmark-style data and generated demo data; it does not contain live customer data.

| Dataset | Rows | Label | Relationships | FinShield use |
| --- | ---: | --- | --- | --- |
| `transactions.csv` | 1,323,234 | `IS_FRAUD` (1,719 true) | `SENDER_ACCOUNT_ID` -> `RECEIVER_ACCOUNT_ID` | PostgreSQL transaction graph and network features |
| `accounts.csv` | 10,000 | `IS_FRAUD` (1,685 true) | `ACCOUNT_ID`, `CUSTOMER_ID` | Account dimension and account-level context |
| `alerts.csv` | 1,719 | `IS_FRAUD` (all true) | Sender/receiver and `TX_ID` | Alert history and validation joins |
| `creditcard.csv` | 284,807 | `Class` (492 fraud) | No account relationship fields | Benchmark ML baseline |

## `transactions.csv`

The file has `TX_ID`, sender and receiver account IDs, `TX_TYPE`, `TX_AMOUNT`, integer `TIMESTAMP`, `IS_FRAUD`, and `ALERT_ID`. It supports directed graph construction, amount/velocity features, and a chronological transaction view. The timestamp is an elapsed-time value rather than a calendar timestamp, so it is not displayed as a real-world date without conversion context.

## `accounts.csv`

The file has account/customer identifiers, initial balance, country, account type, fraud label, and a transaction-behavior identifier. No names, devices, or beneficiary lists are supplied. The import must not infer those fields.

## `alerts.csv`

The file contains alert type, fraud label, transaction ID, sender/receiver IDs, transaction type, amount, and timestamp. It is a labeled alert subset, not a complete alert lifecycle table.

## `creditcard.csv`

This is the well-known anonymized credit-card fraud benchmark shape: `Time`, `V1`-`V28`, `Amount`, and `Class`. The source attribution is not included in this repository, so it is described here as a public benchmark-style dataset rather than claiming a provenance that cannot be verified locally. It has severe class imbalance (492 fraud rows, approximately 0.17%). It has no sender, receiver, account, device, or merchant fields and therefore is used only for the ML baseline.

## Preprocessing and limitations

- CSV headers are validated before import or training.
- Amounts are parsed as numeric and invalid values are rejected rather than silently invented.
- Boolean labels are normalized from the observed `True`/`False` or `0`/`1` values.
- Network analysis uses only the supplied sender/receiver relationships in `transactions.csv`.
- The current simulator remains synthetic and must be labeled separately in the UI.
- The datasets do not establish real customer identity, device telemetry, geographic anomaly, or validated banking risk weights.
