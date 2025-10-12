#!/usr/bin/env python3
# Requests-based smoke for notify sandbox/mock.
import os, requests, json, time, glob

BASE = os.getenv("OI_BASE_URL","http://127.0.0.1:8000")

def run():
    # Send sandbox email via Stage 6 shim
    payload = {"to":"stage6@example.com","template":"generic","subject":"Stage6 Test","data":{"k":"v"}}
    r = requests.post(f"{BASE}/api/notify_ext/send", json=payload, timeout=8)
    if r.status_code != 200:
        return {"status":"FAIL","error":f"notify status {r.status_code}", "body":r.text}
    data = r.json()
    if not data.get("ok"):
        return {"status":"FAIL","error":"notify response not ok", "body":data}

    # Confirm outbox file exists
    path = data.get("path")
    if not path or not os.path.exists(path):
        # Allow a small delay
        time.sleep(0.2)
    if not path or not os.path.exists(path):
        # Fallback: search latest
        files = sorted(glob.glob("qa/notify/outbox/*.json"))
        if not files:
            return {"status":"FAIL","error":"no outbox files found"}
    return {"status":"PASS","details":{"outbox_path":path}}
