#!/usr/bin/env python3
import re, sys, pathlib, shutil, os

ROOT = pathlib.Path(__file__).resolve().parents[1]
gate = ROOT / "release_gate" / "run_all.py"
backup = gate.with_suffix(".py.bak_stage4_v040")

def main():
    if not gate.exists():
        print("ERROR: release_gate/run_all.py not found", file=sys.stderr)
        sys.exit(1)
    src = gate.read_text(encoding="utf-8")
    if "Stage 4" in src and "Production Go-Live" in src:
        print("Stage 4 already appears integrated; no changes made.")
        return

    shutil.copyfile(gate, backup)

    updated = src
    if "import subprocess" not in updated:
        updated = "import subprocess\n" + updated
    if "import os" not in updated:
        updated = "import os\n" + updated

    # Wrap original main (if present)
    if re.search(r"def\s+main\s*\(", updated):
        updated = re.sub(r"def\s+main\s*\(",
                         "__ORIGINAL_MAIN__ = main\n\ndef main(",
                         updated, count=1)
    else:
        updated += "\n\n__ORIGINAL_MAIN__ = None\n"

    tail_block = '''
# === Stage 4 – Production Go-Live (v0.4.0) ===
def _run_stage4():
    print("\\n[Stage 4] Running Production Go-Live Readiness v0.4.0 ...")
    cmd = [sys.executable, "stage4/run_stage4.py"]
    env = dict(os.environ)
    try:
        out = subprocess.run(cmd, check=False, capture_output=True, text=True, env=env)
    except Exception as e:
        print(f"[Stage 4] ERROR: {e}")
        return 1
    print(out.stdout)
    if out.stderr:
        print(out.stderr, file=sys.stderr)
    if out.returncode != 0:
        print("[Stage 4] FAILED with non-zero exit code.")
    else:
        print("[Stage 4] PASS")
    return out.returncode

def main():
    rc = 0
    try:
        if "__ORIGINAL_MAIN__" in globals() and __ORIGINAL_MAIN__:
            rc = __ORIGINAL_MAIN__()
    except SystemExit as se:
        rc = int(se.code) if se.code is not None else 0

    s4 = _run_stage4()
    final_rc = 1 if (rc != 0 or s4 != 0) else 0
    print(f"[ReleaseGate] Final exit code (with Stage 4): {final_rc}")
    sys.exit(final_rc)
'''
    updated += "\n" + tail_block + "\n"

    gate.write_text(updated, encoding="utf-8")
    mark = ROOT / "qa" / "_aggregate" / "stage4_patch_applied.txt"
    mark.parent.mkdir(parents=True, exist_ok=True)
    mark.write_text("Stage4 gate patch applied\n", encoding="utf-8")
    print("Stage 4 gate integration applied successfully.")
    print(f"Backup saved at {backup}")

if __name__ == "__main__":
    main()
