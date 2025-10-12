import json, os, pathlib
from datetime import datetime

BASE_URL = os.environ.get("OI_BASE_URL", "http://127.0.0.1:8000")
OUTDIR = pathlib.Path("qa/bundle_b/v0.2.0")
OUTDIR.mkdir(parents=True, exist_ok=True)

def run_module(modname):
    import importlib
    mod = importlib.import_module(modname)
    return mod.main(BASE_URL, OUTDIR)

def main():
    results = {}
    failures = 0
    suites = [
        "bundle_b.tests_ui.a11y_smoke",
        "bundle_b.tests_ui.perf_smoke",
        "bundle_b.tests_ui.responsive_smoke",
        "bundle_b.tests_ui.error_state_smoke",
    ]
    for s in suites:
        try:
            results[s] = run_module(s)
        except Exception as e:
            results[s] = {"status": "FAIL", "error": str(e)}
            failures += 1
    summary = {
        "bundle_b_ui_quality_v0_2_0": results,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "base_url": BASE_URL,
        "status": "PASS" if failures == 0 and all(v.get("status")=="PASS" for v in results.values()) else "FAIL",
    }
    (OUTDIR / "tests.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
