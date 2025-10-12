#!/usr/bin/env python3
import os, json, time, subprocess, pathlib, sys
from datetime import datetime

ART_DIR = pathlib.Path("qa/stage3/v0.3.0")
ART_DIR.mkdir(parents=True, exist_ok=True)
SUMMARY = ART_DIR / "summary.json"
TEXT = ART_DIR / "tests.txt"

def run(cmd, env=None):
    print("[stage3] $", " ".join(cmd))
    return subprocess.run(cmd, env=env or os.environ.copy(), check=False, capture_output=True, text=True)

def main():
    started = datetime.utcnow().isoformat()+"Z"
    base_url = os.environ.get("OI_BASE_URL","http://127.0.0.1:8000")
    health = os.environ.get("HEALTH_URL", base_url.rstrip("/") + "/health")

    # 1) Staging smoke (requests-based)
    import stage3.smoke_tests as smoke
    smoke_results = smoke.run_smoke(base_url, health)
    with open(ART_DIR / "smoke_results.json","w") as f:
        json.dump(smoke_results, f, indent=2)

    # 2) Release Gate in API mode
    env = os.environ.copy()
    env["HOME_API"] = env.get("HOME_API","1")
    env["HEALTH_URL"] = health
    rg = run([sys.executable, "release_gate/run_all.py"], env=env)

    # Save raw logs
    (ART_DIR / "release_gate_stdout.txt").write_text(rg.stdout)
    (ART_DIR / "release_gate_stderr.txt").write_text(rg.stderr)

    status = "PASS" if rg.returncode == 0 and smoke_results.get("status") == "PASS" else "FAIL"

    summary = {
        "stage": "stage3_v0_3_0",
        "started": started,
        "finished": datetime.utcnow().isoformat()+"Z",
        "base_url": base_url,
        "health_url": health,
        "smoke": smoke_results,
        "release_gate_exit_code": rg.returncode,
        "status": status
    }
    SUMMARY.write_text(json.dumps(summary, indent=2))

    TEXT.write_text(
        "Stage 3 Staging Pilot v0.3.0\n"
        f"Timestamp: {summary['finished']}\n"
        f"Base URL: {base_url}\n"
        f"Health URL: {health}\n"
        f"Smoke: {smoke_results.get('status')}\n"
        f"Release Gate Exit: {rg.returncode}\n"
        f"Status: {status}\n"
    )

    # 3) Update test2.html with a new row
    try:
        import scripts.update_test2_index_stage3 as upd
        upd.update_test_index(
            version="v0.3.0",
            description="Stage 3 Staging Pilot – API health + Release Gate (API-mode)",
            link="/",
            code_link="/qa/stage3/v0.3.0/smoke_results.json",
            test_link="/qa/stage3/v0.3.0/summary.json"
        )
        print("[stage3] test2.html updated.")
    except Exception as e:
        print("[stage3] test2.html update failed:", e)

    print("[stage3] DONE:", status)
    sys.exit(0 if status == "PASS" else 1)

if __name__ == "__main__":
    main()
