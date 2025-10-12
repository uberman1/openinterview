import os, time, json, uuid, requests

BASE = os.environ.get("OI_BASE_URL", "http://127.0.0.1:8000")

def _post(path, payload, **kw):
    return requests.post(BASE + path, json=payload, timeout=10, **kw)

def _get(path, **kw):
    return requests.get(BASE + path, timeout=10, **kw)

def run():
    results = {}
    # 1) health
    r = _get("/health")
    results["health"] = ("PASS" if r.ok and ("ok" in r.text or '"status":"ok"' in r.text) else "FAIL", r.text)

    # 2) signup → verify (mock OTP flow via notifications or direct)
    email = f"uat+{uuid.uuid4().hex[:8]}@example.com"
    r = _post("/api/auth/signup", {"email": email, "invite": "UAT"})
    results["auth_signup"] = ("PASS" if r.ok else "FAIL", r.text)
    # In mock/sandbox we expect an OTP in notify outbox or payload
    otp = None
    try:
        body = r.json()
        otp = body.get("otp") or body.get("debug_otp")
    except Exception:
        pass
    if not otp:
        # try outbox
        try:
            out = _get("/api/notify/outbox").json()
            # pick latest OTP for this email
            for item in reversed(out.get("items", [])):
                if item.get("to") == email and item.get("template") == "otp":
                    otp = item.get("meta", {}).get("otp")
                    break
        except Exception:
            pass

    if not otp:
        results["auth_verify"] = ("FAIL", "No OTP found")
    else:
        r = _post("/api/auth/verify", {"email": email, "otp": str(otp)})
        results["auth_verify"] = ("PASS" if r.ok else "FAIL", r.text)

    # 3) subscription checkout (sandbox/mocked)
    r = _post("/api/stripe/checkout", {"plan": "pro", "email": email})
    results["stripe_checkout"] = ("PASS" if r.ok else "FAIL", r.text)

    # 4) profile create + fetch
    slug = f"uat-{uuid.uuid4().hex[:6]}"
    r = _post("/api/profile", {"slug": slug, "name": "UAT User", "headline": "QA Pilot"})
    results["profile_create"] = ("PASS" if r.ok else "FAIL", r.text)
    r = _get(f"/api/profile/{slug}")
    results["profile_get"] = ("PASS" if r.ok and slug in r.text else "FAIL", r.text)

    # 5) availability create + list
    r = _post("/api/availability", {"profile_id": 1, "slots": ["2025-10-20T14:00:00Z"]})
    results["availability_create"] = ("PASS" if r.ok else "FAIL", r.text)
    r = _get("/api/availability/1")
    results["availability_list"] = ("PASS" if r.ok and "slots" in r.text else "FAIL", r.text)

    # 6) uploads – metadata (no binary transfer needed)
    r = _post("/api/uploads", {"filename": "resume.pdf", "size": 12345, "mime": "application/pdf"})
    results["uploads_meta"] = ("PASS" if r.ok else "FAIL", r.text)

    # 7) notifications – generic
    r = _post("/api/notify/send", {"to": email, "template": "generic", "subject": "UAT Hello", "body": "Hello UAT!"})
    results["notify_generic"] = ("PASS" if r.ok else "FAIL", r.text)

    return results
