"""Shared model construction and feature selection for the benchmark baseline."""
from pathlib import Path
from typing import Iterable

FEATURE_COLUMNS = ["Time", *[f"V{i}" for i in range(1, 29)], "Amount"]
TARGET_COLUMN = "Class"


def build_pipeline():
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    return Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(class_weight="balanced", max_iter=2000, solver="liblinear")),
    ])


def validate_columns(columns: Iterable[str]) -> None:
    required = set(FEATURE_COLUMNS + [TARGET_COLUMN])
    missing = sorted(required - set(columns))
    if missing:
        raise ValueError(f"credit-card dataset is missing required columns: {', '.join(missing)}")


def model_dir() -> Path:
    return Path(__file__).resolve().parent / "models"
