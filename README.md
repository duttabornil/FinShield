# FinShield

FinShield is an explainable financial-fraud defense console. It combines a
React/Vite web interface, a FastAPI backend, PostgreSQL-backed transaction
data, deterministic risk rules, and a graph view for suspicious account
relationships.

The application supports two data paths:

1. **Imported Kaggle data** for the dashboard, transaction stream, alerts, and
   PostgreSQL network analysis.
2. **Synthetic simulator scenarios** for the interactive demo actions. Simulator
   records are intentionally kept separate from the imported dataset.

## Features

- PostgreSQL-backed dashboard totals and transaction stream.
- Chunked, repeatable ingestion of 1.3M+ transactions.
- Idempotent `ON CONFLICT DO UPDATE` imports for accounts, transactions, and
  alerts.
- Progress output every 100,000 transaction rows and per-batch commits.
- Searchable transaction feed with fraud and status filters.
- Alert queue and transaction investigation views.
- Fraud-network visualization using Cytoscape.js.
- Explainable risk scoring for simulator actions.
- Account takeover, suspicious transfer, normal transfer, and fraud-ring
  simulator scenarios.
- Benchmark fraud model trained from the anonymized credit-card dataset.

## Data sources

The repository uses two public Kaggle datasets. The files under `data/raw`
should be treated as public benchmark data, not live customer information.

### Transaction network dataset

The account, transaction, and alert files are used for PostgreSQL-backed
network analysis:

- [Fraud Detection Transactions Dataset on Kaggle](https://www.kaggle.com/datasets/samayashar/fraud-detection-transactions-dataset)

Files used by FinShield:

| File | Rows currently imported | Use |
| --- | ---: | --- |
| `data/raw/accounts.csv` | 10,000 | Account dimension and fraud labels |
| `data/raw/transactions.csv` | 1,323,234 | Directed transaction graph and transaction stream |
| `data/raw/alerts.csv` | 1,719 input rows | Alert import; duplicate `ALERT_ID` values are updated idempotently |

The supplied transaction timestamps are elapsed-time values, not calendar
timestamps. Account names, devices, beneficiary lists, and banking identities
are not inferred from these files.

### Credit-card benchmark dataset

- [Credit Card Fraud Detection on Kaggle](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)

`data/raw/creditcard.csv` contains 284,807 anonymized rows with `Time`,
`V1`-`V28`, `Amount`, and `Class`. It is used only for the benchmark ML model;
it does not contain sender/receiver relationships for the network graph.

## Architecture

```text
React + Vite frontend
          |
          | /api through Vite proxy
          v
FastAPI backend
          |
          +--> PostgreSQL imported dataset
          |      accounts
          |      transactions
          |      alerts
          |
          +--> In-memory synthetic simulator
          +--> Risk and graph engines
          +--> Benchmark ML model
```

The API automatically uses PostgreSQL when `DATABASE_URL` is configured and
the imported tables are available. The simulator remains in memory so that
interactive demo actions do not modify the imported dataset.

## Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer and npm
- PostgreSQL 16 or newer
- Docker Desktop is optional; it can be used to run PostgreSQL

## Configuration

Create or update the project `.env` file:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DB
```

`DATABASE_URL` is required by the importer and is never replaced by a
hardcoded password fallback. Do not commit real credentials to source control.

## Installation and startup

From the repository root:

```powershell
# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Optional: start PostgreSQL with Docker
docker compose up -d db

# Import all Kaggle-derived CSV datasets
python scripts/import_data.py --dataset all

# Optional: train the benchmark model
python ml/train.py --data data/raw/creditcard.csv
```

Start the backend in one terminal:

```powershell
python backend/run.py
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Bulk importer

`scripts/import_data.py` preserves the existing PostgreSQL schema and CSV
column mappings. It uses SQLAlchemy executemany batches:

- Accounts: 5,000 rows per batch.
- Transactions: 10,000 rows per batch.
- Alerts: 5,000 rows per batch.
- Each batch is committed independently.
- Existing rows are updated with `ON CONFLICT`, making reruns idempotent.
- Transaction progress is printed every 100,000 rows.

Run only the transaction import when needed:

```powershell
python scripts/import_data.py --dataset transactions
```

Verify the imported transaction count:

```powershell
python -c "from sqlalchemy import create_engine,text; import os; from dotenv import load_dotenv; load_dotenv(); e=create_engine(os.environ['DATABASE_URL']); c=e.connect(); print(c.execute(text('SELECT COUNT(*), COUNT(DISTINCT transaction_id) FROM transactions')).one()); c.close()"
```

The expected current transaction count is **1,323,234**, matching the data
rows in `data/raw/transactions.csv`.

## API endpoints

- `GET /api/dashboard` - PostgreSQL-backed dashboard totals.
- `GET /api/transactions` - Imported transaction stream with search/filtering.
- `GET /api/transactions/{id}` - Imported transaction details.
- `GET /api/alerts` - Imported alerts plus any simulator alerts.
- `GET /api/network` - Network graph data.
- `POST /api/simulate/{scenario}` - Run a synthetic demo scenario.
- `POST /api/reset` - Reset the in-memory simulator state.

Interactive API documentation is available at
[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Important data limitations

- The Kaggle datasets are public/anonymized benchmark data and do not
  represent real customer accounts.
- Imported account IDs are numeric and do not contain customer names or device
  telemetry.
- Fraud labels and alert rows are dataset labels, not production decisions.
- The simulator's risk explanations and action controls are demonstration
  behavior.
- The frontend displays up to 100 transactions per request; use search and
  filters to investigate the imported dataset.

## Repository structure

```text
backend/              FastAPI application and risk/graph engines
data/raw/             Kaggle-derived CSV files
docs/                 Dataset and model notes
frontend/             React/Vite frontend
ml/                   Benchmark model training and evaluation
scripts/import_data.py PostgreSQL schema creation and bulk importer
```
