#!/usr/bin/env bash
set -euo pipefail
FILE="release_gate/run_all.py"
if [ ! -f "$FILE" ]; then
  echo "[notify patch] release_gate/run_all.py not found; skipping."
  exit 0
fi
if ! grep -q "notify_pack/run.py" "$FILE"; then
  # naive insertion: add notify at the end of steps list if pattern found
  perl -0777 -pe "s/steps\s*=\s*\[/steps = [\n    ('notify', 'notify_pack\/run.py'),/ if $. == 0" -i "$FILE" || true
  if ! grep -q "notify_pack/run.py" "$FILE"; then
    echo "\n# Append manually to your steps list:\n# ('notify', 'notify_pack/run.py')" >> "$FILE"
  fi
  echo "[notify patch] attempted to insert notify pack into release gate"
else
  echo "[notify patch] notify pack already present"
fi
