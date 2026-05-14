#!/usr/bin/env python3
import os, time, json, sys, pathlib
from datetime import datetime
import requests

ART_ROOT = pathlib.Path("qa/stage4/v0.4.0")
ART_ROOT.mkdir(parents=True, exist_ok=True)

BASE_URL = os.environ.get("PROD_URL", os.environ.get("STAGE_URL", "http://127.0.0.1:8000"))
HEALTH_URL = os.environ.get("HEALTH_URL", f"{BASE_URL}/health")
TIMEOUT = float(os.environ.get("S4_TIMEOUT", "5.0"))

def save(name, data):
    p = ART_ROOT / name
    if isinstance(data, (dict, list)):
        p.write_text(json.dumps(data, indent=2), encoding="utf-8")
    else:
        p.write_text(str(data), encoding="utf-8")
    return str(p)

def check_health():
    res = requests.get(HEALTH_URL, timeout=TIMEOUT)
    lat = res.elapsed.total_seconds()*1000.0
    ok = False
    try:
        payload = res.json()
    except Exception:
        payload = {"raw": res.text}
    # accept any common shapes
    if isinstance(payload, dict):
        ok = payload.get("status") == "ok" or payload.get("healthy") is True or payload.get("ok") is True
    return {"ok": ok, "status_code": res.status_code, "latency_ms": round(lat,2), "payload": payload}

def canary_pings(n=5, sleep_s=0.3):
    results = []
    oks = 0
    lats = []
    for _ in range(n):
        try:
            r = requests.get(HEALTH_URL, timeout=TIMEOUT)
            lat = r.elapsed.total_seconds()*1000.0
            results.append({"code": r.status_code, "latency_ms": round(lat,2)})
            lats.append(lat)
            if r.status_code == 200: oks += 1
        except Exception as e:
            results.append({"error": str(e)})
        time.sleep(sleep_s)
    p95 = sorted(lats)[int(len(lats)*0.95)-1] if lats else None
    return {"oks": oks, "count": n, "p95_ms": round(p95,2) if p95 else None, "samples": results}

def fetch_root_headers():
    try:
        r = requests.get(BASE_URL, timeout=TIMEOUT)
    except Exception as e:
        return {"ok": False, "error": str(e)}
    headers = {k.lower(): v for k,v in r.headers.items()}
    csp = headers.get("content-security-policy") or headers.get("content-security-policy-report-only")
    return {"ok": True, "status_code": r.status_code, "csp_present": bool(csp), "csp": csp}

def check_providers():
    # Guards for production configs; do not print secrets
    cfg = {
        "STRIPE_MODE": os.environ.get("STRIPE_TEST","1"),
        "STRIPE_SIGNING_SECRET_set": bool(os.environ.get("STRIPE_SIGNING_SECRET")),
        "NOTIFY_MODE": os.environ.get("NOTIFY_MODE","mock"),
        "EMAIL_FROM_set": bool(os.environ.get("EMAIL_FROM")),
    }
    # Expectations for production go-live (can tune via env flags)
    expect_live = os.environ.get("EXPECT_LIVE","0") == "1"
    issues = []
    if expect_live:
        if cfg["STRIPE_MODE"] != "0":
            issues.append("Stripe not in live mode (STRIPE_TEST=0 expected).")
        if not cfg["STRIPE_SIGNING_SECRET_set"]:
            issues.append("Missing STRIPE_SIGNING_SECRET for webhook validation.")
        if cfg["NOTIFY_MODE"] == "mock":
            issues.append("Notifications still in mock mode; set NOTIFY_MODE=provider (e.g., resend).")
        if not cfg["EMAIL_FROM_set"]:
            issues.append("Missing EMAIL_FROM.")
    return cfg, issues

def main():
    summary = {
        "stage": "Stage 4 – Production Go-Live Readiness",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "base_url": BASE_URL,
        "health_url": HEALTH_URL,
        "checks": {}
    }
    try:
        h = check_health()
        summary["checks"]["health"] = h
        canary = canary_pings()
        summary["checks"]["canary"] = canary
        hdrs = fetch_root_headers()
        summary["checks"]["root_headers"] = hdrs
        providers, provider_issues = check_providers()
        summary["checks"]["provider_config"] = providers
        summary["checks"]["provider_issues"] = provider_issues

        # SLO: accept p95 < 1000 ms when available
        slo_ok = True
        if canary.get("p95_ms") is not None and canary["p95_ms"] > 1000:
            slo_ok = False
        # health must be ok and 5/5 oks
        pass_gate = h.get("ok") and canary.get("oks",0) == canary.get("count",0) and slo_ok and (len(provider_issues) == 0 or os.environ.get("ALLOW_PROVIDER_MOCK","0")=="1")
        summary["status"] = "PASS" if pass_gate else "FAIL"
        save("summary.json", summary)
        save("tests.txt", json.dumps(summary, indent=2))
        print(json.dumps(summary, indent=2))
        return 0 if pass_gate else 1
    except Exception as e:
        summary["status"] = "ERROR"
        summary["error"] = str(e)
        save("summary.json", summary)
        save("tests.txt", json.dumps(summary, indent=2))
        print(json.dumps(summary, indent=2))
        return 2

if __name__ == "__main__":
    import sys; sys.exit(main())
