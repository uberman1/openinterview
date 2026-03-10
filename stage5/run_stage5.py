#!/usr/bin/env python3
import os, json, pathlib, sys, datetime

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTDIR = ROOT / "qa" / "stage5" / "v0.5.0"
OUTDIR.mkdir(parents=True, exist_ok=True)

def read_state():
    p = ROOT / "qa" / "_state" / "session.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def basic_checks():
    markers = [
        ROOT / "qa" / "bundle_a" / "v0.2.0",
        ROOT / "qa" / "bundle_b" / "v0.2.0",
        ROOT / "qa" / "bundle_c" / "v0.2.0",
    ]
    for m in markers:
        if not m.exists():
            return False, f"Missing prerequisite artifacts: {m}"
    return True, "All prerequisite artifacts present"

def health_check():
    url = os.environ.get("HEALTH_URL")
    result = {"enabled": False}
    if not url:
        return result
    result["enabled"] = True
    try:
        import urllib.request
        with urllib.request.urlopen(url, timeout=8) as resp:
            body = resp.read().decode("utf-8", "ignore")
            status = resp.getcode()
        result["http_status"] = status
        result["body"] = body[:500]
        healthy = False
        if '"status"' in body and '"ok"' in body:
            healthy = True
        if '"healthy": true' in body or '"ok": true' in body:
            healthy = True
        result["healthy"] = healthy
        if os.environ.get("EXPECT_LIVE","0") == "1" and not healthy:
            result["error"] = "Expected healthy backend but health endpoint did not return ok:true/status:ok"
        return result
    except Exception as e:
        result["error"] = str(e)
        return result

def write_artifacts(summary):
    (OUTDIR / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    lines = []
    lines.append(f"Stage 5 – Pilot & UAT v0.5.0")
    lines.append(f"Timestamp: {datetime.datetime.utcnow().isoformat()}Z")
    lines.append(f"Prereqs: {summary.get('prereqs',{})}")
    lines.append(f"Health: {summary.get('health',{})}")
    lines.append(f"UAT Hub: {summary.get('uat_hub',{})}")
    (OUTDIR / "tests.txt").write_text("\n".join(lines), encoding="utf-8")

def scan_uat_feedback():
    fb_dir = ROOT / "qa" / "stage5" / "feedback"
    fb_dir.mkdir(parents=True, exist_ok=True)
    return {"count": len(list(fb_dir.glob("*.json")))}

def main():
    prereq_ok, prereq_msg = basic_checks()
    health = health_check()
    state = read_state()
    uat = scan_uat_feedback()

    status = "PASS"
    if not prereq_ok:
        status = "FAIL"
    if health.get("enabled") and os.environ.get("EXPECT_LIVE","0") == "1" and not health.get("healthy"):
        status = "FAIL"

    summary = {
        "stage": "5",
        "version": "v0.5.0",
        "status": status,
        "prereqs": {"ok": prereq_ok, "msg": prereq_msg},
        "health": health,
        "state_snapshot": state,
        "uat_hub": uat,
    }
    write_artifacts(summary)
    print(json.dumps(summary, indent=2))
    return 0 if status == "PASS" else 1

if __name__ == "__main__":
    sys.exit(main())
