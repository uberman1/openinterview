
import json, os, pathlib, importlib
from datetime import datetime

OUT = pathlib.Path("qa/bundle_c/v0.2.0")
OUT.mkdir(parents=True, exist_ok=True)
BASE_URL = os.environ.get("OI_BASE_URL", "http://127.0.0.1:8000")

SUITES = [
    "bundle_c.tests_api.org_test",
    "bundle_c.tests_api.audit_test",
    "bundle_c.tests_api.metrics_test",
]

def run_suite(name):
    mod = importlib.import_module(name)
    return mod.main(BASE_URL, OUT)

def main():
    results = {}
    fail = 0
    for s in SUITES:
        try:
            results[s] = run_suite(s)
            if results[s].get("status") != "PASS":
                fail += 1
        except Exception as e:
            results[s] = {"status":"FAIL", "error": str(e)}
            fail += 1
    summary = {
        "bundle_c_v0_2_0": results,
        "status": "PASS" if fail == 0 else "FAIL",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "base_url": BASE_URL
    }
    (OUT / "tests.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (OUT / "tests.txt").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
