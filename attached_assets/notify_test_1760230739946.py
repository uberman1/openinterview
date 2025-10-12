import os, json, requests, sys

BASE = os.getenv("BUNDLE_A_BASE", "http://127.0.0.1:8000")

def run():
    r1 = requests.post(
        f"{BASE}/api/notify/otp",
        json={"email":"qa@example.com","code":"123456"},
        timeout=5
    )
    r2 = requests.post(
        f"{BASE}/api/notify/send",
        json={"to":"qa@example.com","template":"generic","subject":"Hello","variables":{"x":1}},
        timeout=5
    )
    return {
        "otp": "PASS" if r1.ok else "FAIL",
        "generic": "PASS" if r2.ok else "FAIL",
    }

if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
    sys.exit(0)
