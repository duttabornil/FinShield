"""Evaluate a previously trained benchmark model on the same chronological protocol."""
import argparse
import json
from pathlib import Path

from model import FEATURE_COLUMNS, TARGET_COLUMN, model_dir, validate_columns


def evaluate(data_path: Path, model_path: Path) -> dict:
    import joblib
    import pandas as pd
    from train import calculate_metrics

    frame = pd.read_csv(data_path)
    validate_columns(frame.columns)
    frame = frame.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN]).sort_values("Time").reset_index(drop=True)
    split = int(len(frame) * 0.8)
    test = frame.iloc[split:]
    model = joblib.load(model_path)
    probabilities = model.predict_proba(test[FEATURE_COLUMNS])[:, 1]
    return calculate_metrics(test[TARGET_COLUMN].astype(int).to_numpy(), probabilities)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/raw/creditcard.csv"))
    parser.add_argument("--model", type=Path, default=model_dir() / "fraud_model.joblib")
    args = parser.parse_args()
    metrics = evaluate(args.data, args.model)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
