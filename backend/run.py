import sys
import uvicorn
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

if __name__ == "__main__":
    print("Starting FinShield AI Fraud Defense API on http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
