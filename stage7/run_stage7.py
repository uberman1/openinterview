#!/usr/bin/env python3
import os, json, datetime, pathlib, sys
from stage7.tests_api import smoke_critical_flows, governance_checks

VERSION = "v0.7.0"
ART_DIR = pathlib.Path("qa") / "stage7" / VERSION
ART_DIR.mkdir(parents=True, exist_ok=True)

def main():
    summary = {"stage7_version": VERSION, "timestamp": datetime.datetime.utcnow().isoformat() + "Z"}
    try:
        smoke = smoke_critical_flows.run()
        summary["smoke_critical_flows"] = smoke
        gviz = governance_checks.run()
        summary["governance"] = gviz

        def block_ok(block):
            return all(v[0] == "PASS" for v in block.values())

        status = "PASS" if block_ok(smoke) and block_ok(gviz) else "FAIL"
        summary["status"] = status
    except Exception as e:
        summary["status"] = "ERROR"
        summary["error"] = str(e)

    (ART_DIR / "tests.json").write_text(json.dumps(summary, indent=2))

    lines = []
    lines.append("Stage 7 UAT Pack " + VERSION)
    lines.append("Status: " + summary.get("status", "UNKNOWN"))
    lines.append("Timestamp: " + summary.get("timestamp", ""))
    lines.append("")
    lines.append("Smoke:")
    for k,(s,_) in summary.get("smoke_critical_flows", {}).items():
        lines.append("- " + k + ": " + s)
    lines.append("")
    lines.append("Governance:")
    for k,(s,_) in summary.get("governance", {}).items():
        lines.append("- " + k + ": " + s)

    (ART_DIR / "tests.txt").write_text("\n".join(lines))
    print(json.dumps(summary, indent=2))
    sys.exit(0 if summary.get("status") == "PASS" else 1)

if __name__ == "__main__":
    main()
