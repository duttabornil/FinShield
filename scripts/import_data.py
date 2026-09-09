"""Import the supplied CSV datasets into PostgreSQL.

Usage:
    python scripts/import_data.py
    python scripts/import_data.py --dataset transactions

DATABASE_URL is loaded from the project .env file or environment.
"""
import argparse
import csv
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
load_dotenv(ROOT / ".env")

EXPECTED = {
    "accounts": ["ACCOUNT_ID", "CUSTOMER_ID", "INIT_BALANCE", "COUNTRY", "ACCOUNT_TYPE", "IS_FRAUD", "TX_BEHAVIOR_ID"],
    "transactions": ["TX_ID", "SENDER_ACCOUNT_ID", "RECEIVER_ACCOUNT_ID", "TX_TYPE", "TX_AMOUNT", "TIMESTAMP", "IS_FRAUD", "ALERT_ID"],
    "alerts": ["ALERT_ID", "ALERT_TYPE", "IS_FRAUD", "TX_ID", "SENDER_ACCOUNT_ID", "RECEIVER_ACCOUNT_ID", "TX_TYPE", "TX_AMOUNT", "TIMESTAMP"],
}


def required_package():
    try:
        from sqlalchemy import create_engine, text
        return create_engine, text
    except ImportError as exc:
        raise SystemExit("Install backend/requirements.txt before importing data; SQLAlchemy is missing.") from exc


def parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"true", "1", "t"}:
        return True
    if normalized in {"false", "0", "f"}:
        return False
    raise ValueError(f"invalid boolean value: {value!r}")


def resolve_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    fallback = "postgresql+psycopg://localhost:5432/finshield"
    print(
        "DATABASE_URL is not set; attempting a passwordless local fallback "
        f"({fallback}). Set DATABASE_URL in .env for authenticated PostgreSQL setups.",
        file=sys.stderr,
    )
    return fallback


def read_rows(name: str):
    path = RAW / f"{name}.csv"
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        missing = [column for column in EXPECTED[name] if column not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"{path} is missing required columns: {', '.join(missing)}")
        for row in reader:
            yield row


def create_schema(connection):
    from sqlalchemy import text

    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS accounts (
            account_id VARCHAR(128) PRIMARY KEY,
            customer_id VARCHAR(128),
            initial_balance NUMERIC(18, 2) NOT NULL,
            country VARCHAR(32),
            account_type VARCHAR(64),
            is_fraud BOOLEAN NOT NULL,
            tx_behavior_id INTEGER,
            raw_features JSONB NOT NULL DEFAULT '{}'::jsonb
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id BIGINT PRIMARY KEY,
            sender_account_id VARCHAR(128) NOT NULL,
            receiver_account_id VARCHAR(128) NOT NULL,
            transaction_type VARCHAR(64),
            amount NUMERIC(18, 2) NOT NULL,
            event_time NUMERIC(18, 6),
            is_fraud BOOLEAN NOT NULL,
            alert_id BIGINT,
            raw_features JSONB NOT NULL DEFAULT '{}'::jsonb
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS alerts (
            alert_id BIGINT PRIMARY KEY,
            alert_type VARCHAR(128),
            is_fraud BOOLEAN NOT NULL,
            transaction_id BIGINT,
            sender_account_id VARCHAR(128),
            receiver_account_id VARCHAR(128),
            transaction_type VARCHAR(64),
            amount NUMERIC(18, 2),
            event_time NUMERIC(18, 6),
            raw_features JSONB NOT NULL DEFAULT '{}'::jsonb
        )
    """))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_sender ON transactions(sender_account_id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_receiver ON transactions(receiver_account_id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_fraud ON transactions(is_fraud)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_time ON transactions(event_time)"))


def import_accounts(connection):
    from sqlalchemy import text
    statement = text("""
        INSERT INTO accounts (account_id, customer_id, initial_balance, country, account_type, is_fraud, tx_behavior_id, raw_features)
        VALUES (:account_id, :customer_id, :initial_balance, :country, :account_type, :is_fraud, :tx_behavior_id, CAST(:raw_features AS jsonb))
        ON CONFLICT (account_id) DO UPDATE SET customer_id=EXCLUDED.customer_id, initial_balance=EXCLUDED.initial_balance,
          country=EXCLUDED.country, account_type=EXCLUDED.account_type, is_fraud=EXCLUDED.is_fraud,
          tx_behavior_id=EXCLUDED.tx_behavior_id, raw_features=EXCLUDED.raw_features
    """)
    count = 0
    for row in read_rows("accounts"):
        connection.execute(statement, {"account_id": row["ACCOUNT_ID"], "customer_id": row["CUSTOMER_ID"],
            "initial_balance": float(row["INIT_BALANCE"]), "country": row["COUNTRY"], "account_type": row["ACCOUNT_TYPE"],
            "is_fraud": parse_bool(row["IS_FRAUD"]), "tx_behavior_id": int(row["TX_BEHAVIOR_ID"]), "raw_features": "{}"})
        count += 1
    return count


def import_transactions(connection, name):
    from sqlalchemy import text
    statement = text("""
        INSERT INTO transactions (transaction_id, sender_account_id, receiver_account_id, transaction_type, amount, event_time, is_fraud, alert_id, raw_features)
        VALUES (:transaction_id, :sender_account_id, :receiver_account_id, :transaction_type, :amount, :event_time, :is_fraud, :alert_id, CAST(:raw_features AS jsonb))
        ON CONFLICT (transaction_id) DO UPDATE SET sender_account_id=EXCLUDED.sender_account_id, receiver_account_id=EXCLUDED.receiver_account_id,
          transaction_type=EXCLUDED.transaction_type, amount=EXCLUDED.amount, event_time=EXCLUDED.event_time,
          is_fraud=EXCLUDED.is_fraud, alert_id=EXCLUDED.alert_id, raw_features=EXCLUDED.raw_features
    """)
    count = 0
    for row in read_rows(name):
        connection.execute(statement, {"transaction_id": int(row["TX_ID"]), "sender_account_id": row["SENDER_ACCOUNT_ID"],
            "receiver_account_id": row["RECEIVER_ACCOUNT_ID"], "transaction_type": row["TX_TYPE"],
            "amount": float(row["TX_AMOUNT"]), "event_time": float(row["TIMESTAMP"]),
            "is_fraud": parse_bool(row["IS_FRAUD"]), "alert_id": int(row["ALERT_ID"]), "raw_features": "{}"})
        count += 1
    return count


def import_alerts(connection):
    from sqlalchemy import text
    statement = text("""
        INSERT INTO alerts (alert_id, alert_type, is_fraud, transaction_id, sender_account_id, receiver_account_id, transaction_type, amount, event_time, raw_features)
        VALUES (:alert_id, :alert_type, :is_fraud, :transaction_id, :sender_account_id, :receiver_account_id, :transaction_type, :amount, :event_time, CAST(:raw_features AS jsonb))
        ON CONFLICT (alert_id) DO UPDATE SET alert_type=EXCLUDED.alert_type, is_fraud=EXCLUDED.is_fraud,
          transaction_id=EXCLUDED.transaction_id, sender_account_id=EXCLUDED.sender_account_id,
          receiver_account_id=EXCLUDED.receiver_account_id, transaction_type=EXCLUDED.transaction_type,
          amount=EXCLUDED.amount, event_time=EXCLUDED.event_time, raw_features=EXCLUDED.raw_features
    """)
    count = 0
    for row in read_rows("alerts"):
        connection.execute(statement, {"alert_id": int(row["ALERT_ID"]), "alert_type": row["ALERT_TYPE"],
            "is_fraud": parse_bool(row["IS_FRAUD"]), "transaction_id": int(row["TX_ID"]),
            "sender_account_id": row["SENDER_ACCOUNT_ID"], "receiver_account_id": row["RECEIVER_ACCOUNT_ID"],
            "transaction_type": row["TX_TYPE"], "amount": float(row["TX_AMOUNT"]),
            "event_time": float(row["TIMESTAMP"]), "raw_features": "{}"})
        count += 1
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", choices=["accounts", "transactions", "alerts", "all"], default="all")
    args = parser.parse_args()
    create_engine, _ = required_package()
    url = resolve_database_url()
    engine = create_engine(url)
    with engine.begin() as connection:
        create_schema(connection)
        counts = {}
        if args.dataset in {"accounts", "all"}:
            counts["accounts"] = import_accounts(connection)
        if args.dataset in {"transactions", "all"}:
            counts["transactions"] = import_transactions(connection, "transactions")
        if args.dataset in {"alerts", "all"}:
            counts["alerts"] = import_alerts(connection)
    print("Imported records:", counts)


if __name__ == "__main__":
    main()
