"""Optional inference service for the trained benchmark model."""
import json
from pathlib import Path
from typing import Dict, Optional

MODEL_DIR = Path(__file__).resolve().parents[2] / "ml" / "models"
MODEL_PATH = MODEL_DIR / "fraud_model.joblib"
METRICS_PATH = MODEL_DIR / "metrics.json"
FEATURE_COLUMNS = ["Time", *[f"V{i}" for i in range(1, 29)], "Amount"]


class BenchmarkModel:
    def __init__(self):
        self._model = None
        if MODEL_PATH.exists():
            try:
                import joblib
                self._model = joblib.load(MODEL_PATH)
            except Exception:
                self._model = None

    @property
    def available(self) -> bool:
        return self._model is not None

    def predict_probability(self, features: Optional[Dict[str, float]]) -> Optional[float]:
        if not self.available or not features:
            return None
        missing = [name for name in FEATURE_COLUMNS if name not in features]
        if missing:
            raise ValueError(f"benchmark_features is missing: {', '.join(missing)}")
        import pandas as pd
        values = pd.DataFrame([[float(features[name]) for name in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
        return float(self._model.predict_proba(values)[0][1])

    @staticmethod
    def metrics() -> Optional[dict]:
        if not METRICS_PATH.exists():
            return None
        try:
            return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None


benchmark_model = BenchmarkModel()