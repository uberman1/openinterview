# Adds Stage 6 runner to the Release Gate (after Bundle C).
import io,sys,re,datetime,os
from pathlib import Path

RG = Path("release_gate/run_all.py")
bak = RG.with_suffix(".py.bak")
if not RG.exists():
    print("release_gate/run_all.py not found", file=sys.stderr); sys.exit(1)

orig = RG.read_text(encoding="utf-8")
bak.write_text(orig, encoding="utf-8")

marker = "PACKS = ["
if marker not in orig:
    print("PACKS list not found in run_all.py", file=sys.stderr); sys.exit(1)

# Add stage6 runner if not present
if "stage6.run_stage6" in orig:
    print("Stage 6 already present"); sys.exit(0)

new = re.sub(r"(PACKS\s*=\s*\[)([^\]]*)(\])",
             r"\1\2, ('stage6.run_stage6', 'Stage6 v0.6.0')\3",
             orig, count=1)

RG.write_text(new, encoding="utf-8")
print("Stage 6 added to Release Gate")
