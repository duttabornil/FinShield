# FinShield ML Baseline

The initial ML component is a class-weighted logistic regression trained on the supplied `data/raw/creditcard.csv` benchmark-style dataset. The target is the observed `Class` column; no target or account relationships are inferred.

## Training protocol

- Features: `Time`, `V1` through `V28`, and `Amount`.
- Missing feature or label values are dropped after schema validation.
- Rows are sorted by `Time` and split chronologically 80/20 to reduce temporal leakage.
- `StandardScaler` and logistic regression are persisted together as one joblib pipeline.
- `class_weight=balanced` compensates for the observed 492 positive rows among 284,807 records.
- Metrics are calculated from model probabilities and a documented 0.5 decision threshold.

Run:

```bash
python ml/train.py --data data/raw/creditcard.csv
python ml/evaluate.py --data data/raw/creditcard.csv
```

Outputs are written to `ml/models/fraud_model.joblib` and `ml/models/metrics.json`. Metrics are generated at training time and are intentionally not hardcoded into the application.

## Verified run

The current artifact was trained from 284,807 rows using 227,845 training rows and 56,962 chronological test rows. At the documented 0.5 threshold, it produced:

| Metric | Value |
| --- | ---: |
| Precision | 0.07097457627118645 |
| Recall | 0.8933333333333333 |
| F1 | 0.13150147203140333 |
| ROC-AUC | 0.986294232425686 |
| PR-AUC | 0.7619568272539438 |

The test partition contained 75 positive rows. These are benchmark evaluation results, not a claim about production banking performance.

## Limitations

This benchmark has anonymized features and no sender, receiver, device, merchant, or account identity. Its predictions cannot directly provide network intelligence or explain a real customer event. Network and behavioral explanations must come from the separate transaction dataset or the synthetic simulator. The model is a research baseline, not a validated production fraud model.
