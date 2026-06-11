#!/usr/bin/env python3
# Requests-based smoke for Stripe sandbox/shadow paths.
import os, requests

BASE = os.getenv("OI_BASE_URL","http://127.0.0.1:8000")

def run():
    # Ensure endpoint reachable
    try:
        r = requests.get(f"{BASE}/health", timeout=5)
        assert r.status_code == 200
    except Exception as e:
        return {"status":"FAIL","error":f"health check failed: {e}"}

    # Call Stage 6 shim (safe regardless of flags)
    payload = {"plan":"pro","email":"stage6@example.com"}
    r = requests.post(f"{BASE}/api/stripe_ext/checkout", json=payload, timeout=8)
    if r.status_code != 200:
        return {"status":"FAIL","error":f"checkout status {r.status_code}", "body":r.text}
    data = r.json()
    # Basic assertions independent of mode
    if "url" not in data:
        return {"status":"FAIL","error":"missing url in response", "body":data}

    # Webhook echo test
    wr = requests.post(f"{BASE}/api/stripe_ext/webhook", json={"payload":{"type":"checkout.session.completed"},"signature":"test"}, timeout=5)
    if wr.status_code != 200 or not wr.json().get("ok"):
        return {"status":"FAIL","error":"webhook echo failed", "body":wr.text}

    return {"status":"PASS","details":{"checkout_url":data.get("url")}}
