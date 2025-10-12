#!/usr/bin/env bash
set -euo pipefail

OUTDIR="qa/stage4/v0.4.0"
mkdir -p "$OUTDIR"

echo "[Stage4] Running Production Go-Live Readiness..."
python3 stage4/run_stage4.py || true

if [ -f "$OUTDIR/summary.json" ]; then
  echo "[Stage4] Results:"
  cat "$OUTDIR/summary.json"
fi

if [ -f "$OUTDIR/tests.txt" ]; then
  echo
  cat "$OUTDIR/tests.txt"
fi

if [ -f "scripts/update_test2_index_stage4.py" ]; then
  PYTHONPATH=. python3 scripts/update_test2_index_stage4.py || true
fi
