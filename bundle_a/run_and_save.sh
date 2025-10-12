#!/usr/bin/env bash
set -euo pipefail
OUTDIR="qa/bundle_a/v0.2.0"
mkdir -p "$OUTDIR"
PYTHONPATH=. python bundle_a/run_bundle_a_tests.py | tee "$OUTDIR/tests.json"
python - "$OUTDIR/tests.json" > "$OUTDIR/tests.txt" << 'PY'
import sys, json, pathlib
p = pathlib.Path(sys.argv[1])
data = json.loads(p.read_text())
lines = ["Bundle A v0.2.0 Results"]
for pack, res in data.items():
    ok = all(v=="PASS" for v in res.values())
    lines.append(f"- {pack}: {'PASS' if ok else 'FAIL'}")
print("\n".join(lines))
PY
