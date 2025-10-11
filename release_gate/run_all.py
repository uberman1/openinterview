import os, sys, json, subprocess, datetime
from pathlib import Path
from release_gate.aggregate import find_latest_tests, overall_status

PACKS = [
    ("password", "python password_pack/run.py"),
    ("subscription", "python subscription_pack/run.py"),
    ("availability", "python availability_pack/run.py"),
    ("shareable_profile", "python profile_pack/run.py"),  # profile_pack outputs to qa/shareable_profile
    ("profiles", "python profiles_pack/run.py"),
    ("uploads", "python uploads_pack/run.py"),
    ("home", "python home_pack/run.py"),
    ("auth", "python auth_pack/run.py"),
]

def run(cmd):
    print(f"\n=== RUN: {cmd} ===", flush=True)
    return subprocess.call(cmd, shell=True)

def main():
    started = datetime.datetime.utcnow().isoformat() + "Z"
    failures = []

    # Ensure Playwright is installed (no-op if already)
    try:
        subprocess.call("python -m playwright install --with-deps chromium", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    for name, cmd in PACKS:
        code = run(cmd)
        if code != 0:
            failures.append((name, code))

    results = find_latest_tests()
    ok, details = overall_status(results)

    ended = datetime.datetime.utcnow().isoformat() + "Z"
    roll = {
        "release_gate": "v0.1.0",
        "started": started,
        "ended": ended,
        "env": {
            "HOME_API": os.environ.get("HOME_API", "0"),
            "HEALTH_URL": os.environ.get("HEALTH_URL"),
            "OI_BASE_URL": os.environ.get("OI_BASE_URL", "http://127.0.0.1:5000"),
        },
        "pack_results": results,
        "pack_status": details,
        "subprocess_failures": failures,
        "status": "PASS" if ok and not failures else "FAIL"
    }

    outdir = Path("qa") / "_aggregate" / started.replace(":","-")
    outdir.mkdir(parents=True, exist_ok=True)
    with open(outdir / "summary.json", "w", encoding="utf-8") as f:
        json.dump(roll, f, indent=2)
    with open(outdir / "tests.txt", "w", encoding="utf-8") as f:
        f.write(json.dumps(roll, indent=2))

    print("\n=== RELEASE GATE SUMMARY ===")
    print(json.dumps(roll, indent=2))

    # Non-zero exit on any failure
    if roll["status"] != "PASS":
        sys.exit(1)

if __name__ == "__main__":
    main()
