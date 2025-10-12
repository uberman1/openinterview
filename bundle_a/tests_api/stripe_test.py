import os, time, json, hmac, hashlib, requests, sys

BASE = os.getenv("BUNDLE_A_BASE", "http://127.0.0.1:8000")
SECRET = os.getenv("STRIPE_SIGNING_SECRET", "whsec_dev")

def sign(payload: dict, secret: str):
    ts = str(int(time.time()))
    raw = ts + "." + json.dumps(payload, separators=(",", ":"), sort_keys=True)
    v1 = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return {"header": f"t={ts},v1={v1}", "raw": raw}

def run():
    good_payload = {"type":"checkout.session.completed","data":{"object":{"plan":"pro"}}}
    sig = sign(good_payload, SECRET)

    good = requests.post(
        f"{BASE}/api/stripe/webhook",
        data=sig["raw"],
        headers={"stripe-signature": sig["header"], "content-type": "text/plain"},
        timeout=5
    )
    bad = requests.post(
        f"{BASE}/api/stripe/webhook",
        data=sig["raw"],
        headers={"stripe-signature": "t=0,v1=deadbeef", "content-type": "text/plain"},
        timeout=5
    )
    return {
        "webhook_sig_ok": "PASS" if good.ok else "FAIL",
        "webhook_sig_bad": "PASS" if bad.status_code == 400 else "FAIL",
    }

if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
    sys.exit(0)
