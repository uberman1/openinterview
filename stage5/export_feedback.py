#!/usr/bin/env python3
import json, pathlib, datetime, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "qa" / "stage5" / "feedback"
OUT.mkdir(parents=True, exist_ok=True)

def main():
    local = ROOT / "qa" / "stage5" / "feedback_local.json"
    if not local.exists():
        print("No local feedback file found (qa/stage5/feedback_local.json). Nothing to export.")
        return 0
    try:
        data = json.loads(local.read_text(encoding="utf-8"))
    except Exception as e:
        print("Invalid JSON in feedback_local.json:", e)
        return 1
    if not isinstance(data, list):
        print("feedback_local.json must be a list of feedback entries")
        return 1
    count = 0
    for i, entry in enumerate(data, 1):
        ts = entry.get("ts") or datetime.datetime.utcnow().isoformat() + "Z"
        safe = ts.replace(":", "-")
        p = OUT / f"entry_{i}_{safe}.json"
        p.write_text(json.dumps(entry, indent=2), encoding="utf-8")
        count += 1
    print(f"Exported {count} feedback entries to {OUT}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
