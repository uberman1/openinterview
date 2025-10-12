
#!/usr/bin/env python3
import pathlib

gate = pathlib.Path("release_gate/run_all.py")
if not gate.exists():
    print("release_gate/run_all.py not found; skipping.")
    raise SystemExit(0)
txt = gate.read_text(encoding="utf-8")

marker = "PACKS = ["
if marker in txt and "('bundle_c', 'bundle_c/run_bundle_c_tests.py')" not in txt:
    txt = txt.replace(marker, marker + "\n    ('bundle_c', 'bundle_c/run_bundle_c_tests.py'),")
    gate.write_text(txt, encoding="utf-8")
    print("Release gate updated to include Bundle C.")
else:
    print("Release gate already includes Bundle C or unexpected format.")
