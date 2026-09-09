# FinShield — Stitch UI Integration Notes

## What changed
- Replaced the previous sidebar-heavy shell with a compact Stitch-inspired top navigation.
- Rebuilt the Overview dashboard with the supplied dark enterprise-fintech visual language.
- Kept dashboard values connected to `/api/dashboard` rather than copying the Stitch mock's hard-coded values.
- Preserved the existing functional views: Transactions, Fraud Network, Alerts, Simulator, Investigation Modal, and Demo Guide.
- Preserved FastAPI backend routes, risk scoring, graph analysis, simulator behavior, and synthetic dataset reset.
- Added responsive layouts for smaller screens.

## Claims intentionally removed/avoided
The supplied visual mock contained presentation-only labels such as model-version, confidence, forensic-grade, and fully-frozen claims. Those were not carried into the integrated build because the current prototype does not validate those claims.

## Run locally
Backend:
```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Validation performed
- Python backend source compiles successfully.
- `backend/test_backend.py` passes all included backend tests.
- Frontend source integration was completed, but the packaged dependency tree from the original ZIP was platform-incomplete in the build environment. Run `npm install` on the target machine before building/running the frontend.
