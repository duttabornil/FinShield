"""Train the explainable fraud benchmark baseline.

Usage: python ml/train.py --data data/raw/creditcard.csv
"""
import argparse
import json
from pathlib import Path

from model import FEATURE_COLUMNS, TARGET_COLUMN, build_pipeline, model_dir, validate_columns


def calculate_metrics(y_true, probabilities, threshold=0.5):
    from sklearn.metrics import (average_precision_score, confusion_matrix, f1_score,
                                 precision_score, recall_score, roc_auc_score)

    predictions = (probabilities >= threshold).astype(int)
    return {
        "threshold": threshold,
        "precision": precision_score(y_true, predictions, zero_division=0),
        "recall": recall_score(y_true, predictions, zero_division=0),
        "f1": f1_score(y_true, predictions, zero_division=0),
        "roc_auc": roc_auc_score(y_true, probabilities),
        "pr_auc": average_precision_score(y_true, probabilities),
        "confusion_matrix": confusion_matrix(y_true, predictions).tolist(),
        "test_rows": int(len(y_true)),
        "positive_test_rows": int(y_true.sum()),
    }


def train(data_path: Path) -> dict:
    import joblib
    import pandas as pd

    frame = pd.read_csv(data_path)
    validate_columns(frame.columns)
    frame[TARGET_COLUMN] = pd.to_numeric(frame[TARGET_COLUMN], errors="raise").astype(int)
    frame = frame.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])
    frame = frame.sort_values("Time").reset_index(drop=True)
    split = int(len(frame) * 0.8)
    if split <= 0 or split >= len(frame) or frame.iloc[:split][TARGET_COLUMN].nunique() < 2:
        raise ValueError("chronological split does not contain both classes in the training partition")

    x_train = frame.loc[:split - 1, FEATURE_COLUMNS]
    y_train = frame.loc[:split - 1, TARGET_COLUMN]
    x_test = frame.loc[split:, FEATURE_COLUMNS]
    y_test = frame.loc[split:, TARGET_COLUMN]
    if y_test.nunique() < 2:
        raise ValueError("chronological test partition does not contain both classes")

    pipeline = build_pipeline()
    pipeline.fit(x_train, y_train)
    probabilities = pipeline.predict_proba(x_test)[:, 1]
    metrics = calculate_metrics(y_test.to_numpy(), probabilities)
    metrics.update({
        "model": "logistic_regression",
        "features": FEATURE_COLUMNS,
        "train_rows": int(len(x_train)),
        "positive_train_rows": int(y_train.sum()),
        "split": "chronological 80/20 by Time",
        "class_imbalance_strategy": "class_weight=balanced",
        "source": str(data_path),
    })

    output_dir = model_dir()
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, output_dir / "fraud_model.joblib")
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/raw/creditcard.csv"))
    args = parser.parse_args()
    metrics = train(args.data)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
