import os, json, time, requests
from datetime import datetime

def ok(resp):
    try:
        j = resp.json()
    except Exception:
        return False
    return (resp.status_code == 200) and (j.get("status") == "ok" or j.get("healthy") is True or j.get("ok") is True)

def run_smoke(base_url, health_url):
    out = {"started": datetime.utcnow().isoformat()+"Z", "checks": []}
    try:
        h = requests.get(health_url, timeout=5)
        out["checks"].append({"check":"health","status":"PASS" if ok(h) else "FAIL","status_code":h.status_code,"body":h.text[:200]})
    except Exception as e:
        out["checks"].append({"check":"health","status":"FAIL","error":str(e)})
    # auth csrf
    try:
        r = requests.get(base_url.rstrip("/") + "/api/auth/csrf", timeout=5)
        out["checks"].append({"check":"auth_csrf","status":"PASS" if r.status_code==200 else "FAIL","status_code":r.status_code})
    except Exception as e:
        out["checks"].append({"check":"auth_csrf","status":"FAIL","error":str(e)})
    # security csrf
    try:
        r = requests.get(base_url.rstrip("/") + "/api/security/csrf", timeout=5)
        out["checks"].append({"check":"security_csrf","status":"PASS" if r.status_code==200 else "FAIL","status_code":r.status_code})
    except Exception as e:
        out["checks"].append({"check":"security_csrf","status":"FAIL","error":str(e)})
    # stripe webhook signature negative test (missing sig)
    try:
        r = requests.post(base_url.rstrip("/") + "/api/stripe/webhook", data="{}", headers={"Content-Type":"application/json"}, timeout=5)
        out["checks"].append({"check":"stripe_webhook_sig","status":"PASS" if r.status_code in (400,401,403) else "FAIL","status_code":r.status_code})
    except Exception as e:
        out["checks"].append({"check":"stripe_webhook_sig","status":"FAIL","error":str(e)})
    # notify outbox
    try:
        r = requests.get(base_url.rstrip("/") + "/api/notify/outbox", timeout=5)
        out["checks"].append({"check":"notify_outbox","status":"PASS" if r.status_code==200 else "FAIL","status_code":r.status_code})
    except Exception as e:
        out["checks"].append({"check":"notify_outbox","status":"FAIL","error":str(e)})
    # overall
    out["finished"] = datetime.utcnow().isoformat()+"Z"
    out["status"] = "PASS" if all(c.get("status")=="PASS" for c in out["checks"]) else "FAIL"
    return out
