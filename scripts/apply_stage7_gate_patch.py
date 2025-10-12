#!/usr/bin/env python3
# Adds Stage 7 runner to the Release Gate (after Stage 6).
import sys, re
from pathlib import Path

RG = Path("release_gate/run_all.py")
bak = RG.with_suffix(".py.bak_stage7")

if not RG.exists():
    print("release_gate/run_all.py not found", file=sys.stderr)
    sys.exit(1)

orig = RG.read_text(encoding="utf-8")
bak.write_text(orig, encoding="utf-8")

marker = "PACKS = ["
if marker not in orig:
    print("PACKS list not found in run_all.py", file=sys.stderr)
    sys.exit(1)

# Add stage7 runner if not present
if "stage7.run_stage7" in orig:
    print("Stage 7 already present")
    sys.exit(0)

new = re.sub(r"(PACKS\s*=\s*\[)([^\]]*)(\])",
             r"\1\2, ('stage7.run_stage7', 'Stage7 UAT v0.7.0')\3",
             orig, count=1)

RG.write_text(new, encoding="utf-8")
print("Stage 7 added to Release Gate")
