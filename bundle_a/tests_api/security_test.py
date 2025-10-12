import os, requests, sys

BASE = os.getenv("BUNDLE_A_BASE", "http://127.0.0.1:8000")

def test_csrf():
    r = requests.get(f"{BASE}/api/security/csrf", timeout=5)
    r.raise_for_status()
    data = r.json()
    token = data.get("csrf", "")
    return bool(token and "." in token)

def test_rate_limit():
    ok = True
    for i in range(6):
        r = requests.get(f"{BASE}/api/security/rate_check", timeout=5)
        if i < 5 and r.status_code != 200: ok = False
        if i == 5 and r.status_code != 429: ok = False
    return ok

def test_session_touch():
    r = requests.post(f"{BASE}/api/security/touch", timeout=5)
    return r.status_code == 200 and r.json().get("ok") is True

def run():
    return {
        "csrf": "PASS" if test_csrf() else "FAIL",
        "rate_limit": "PASS" if test_rate_limit() else "FAIL",
        "session_touch": "PASS" if test_session_touch() else "FAIL",
    }

if __name__ == "__main__":
    import json
    print(json.dumps(run(), indent=2))
    sys.exit(0)
