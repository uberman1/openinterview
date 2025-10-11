from playwright.sync_api import sync_playwright
import hmac, hashlib, json, time

def sign(payload: dict, secret: str):
    ts = str(int(time.time()))
    raw = ts + "." + json.dumps(payload, separators=(",", ":"), sort_keys=True)
    v1 = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return {"header": f"t={ts},v1={v1}", "raw": raw}

def run():
    secret = "whsec_dev"
    payload = {"type":"checkout.session.completed","data":{"object":{"plan":"pro"}}}
    sig = sign(payload, secret)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"], headless=True)
        req = b.new_page().request
        r = req.post("http://localhost:8000/api/stripe/webhook", data=sig["raw"], headers={"stripe-signature": sig["header"]})
        bad = req.post("http://localhost:8000/api/stripe/webhook", data=sig["raw"], headers={"stripe-signature": "t=0,v1=deadbeef"})
        b.close()
    return {
        "webhook_sig_ok": "PASS" if r.ok else "FAIL",
        "webhook_sig_bad": "PASS" if bad.status == 400 else "FAIL"
    }

if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
