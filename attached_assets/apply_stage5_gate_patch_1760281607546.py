
import pathlib, sys, shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
gate = ROOT / "release_gate" / "run_all.py"
backup = gate.with_suffix(".py.bak_stage5_v050")

def main():
    if not gate.exists():
        print("ERROR: release_gate/run_all.py not found", file=sys.stderr); sys.exit(1)
    src = gate.read_text(encoding="utf-8")
    if "Stage 5 – Pilot & UAT" in src:
        print("Stage 5 already integrated; skipping."); return
    shutil.copyfile(gate, backup)
    add = '''
# === Stage 5 – Pilot & UAT (v0.5.0) ===
def _run_stage5():
    import subprocess, os, sys
    print("\\n[Stage 5] Running Pilot & UAT v0.5.0 ...")
    cmd = [sys.executable, "stage5/run_stage5.py"]
    proc = subprocess.run(cmd, check=False, capture_output=True, text=True, env=os.environ.copy())
    print(proc.stdout)
    if proc.stderr: print(proc.stderr, file=sys.stderr)
    if proc.returncode != 0: print("[Stage 5] FAILED")
    else: print("[Stage 5] PASS")
    return proc.returncode

_OLD_MAIN_ = main if "main" in globals() else None
def main():
    rc = 0
    if _OLD_MAIN_:
        try:
            rc = _OLD_MAIN_()
        except SystemExit as se:
            rc = int(se.code) if se.code is not None else 0
    s5 = _run_stage5()
    final = 1 if (rc != 0 or s5 != 0) else 0
    print(f"[ReleaseGate] Final exit code (with Stage 5): {final}")
    import sys as _sys
    _sys.exit(final)
'''
    updated = src + "\n" + add + "\n"
    gate.write_text(updated, encoding="utf-8")
    print("Stage 5 integrated. Backup at:", backup)

if __name__ == "__main__":
    main()
