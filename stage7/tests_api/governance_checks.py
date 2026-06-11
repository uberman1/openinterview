#!/usr/bin/env python3
import os, requests

BASE = os.environ.get("OI_BASE_URL", "http://127.0.0.1:8000")

def _get(path, **kw):
    return requests.get(BASE + path, timeout=10, **kw)

def run():
    results = {}
    # extended health
    r = _get("/health/extended")
    results["health_extended"] = ("PASS" if r.ok else "FAIL", r.text)

    # metrics
    r = _get("/metrics")
    ok = r.ok and "process_uptime_seconds" in r.text
    results["metrics_prom"] = ("PASS" if ok else "FAIL", r.text[:300])

    # audit export (should return JSON with redaction applied)
    r = _get("/api/audit")
    results["audit_list"] = ("PASS" if r.ok else "FAIL", r.text[:300])
    return results
