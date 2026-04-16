
#!/usr/bin/env python3
import re, pathlib, sys, shutil

RUN_ALL = pathlib.Path("release_gate/run_all.py")
if not RUN_ALL.exists():
    print("ERROR: release_gate/run_all.py not found.", file=sys.stderr)
    sys.exit(1)

src = RUN_ALL.read_text(encoding="utf-8")
if "bundle_a/run_bundle_a_tests.py" in src:
    print("Bundle A step already present. No changes made.")
    sys.exit(0)

backup = RUN_ALL.with_suffix(".py.bak")
shutil.copyfile(RUN_ALL, backup)

pattern = re.compile(r"(STEPS\s*=\s*\[)(.*?)(\])", re.S)
m = pattern.search(src)
if not m:
    print("Could not locate STEPS list. Please add manually.", file=sys.stderr)
    sys.exit(2)

before, body, after = m.group(1), m.group(2), m.group(3)
insertion = '\n    ("bundle_a_v0_2_0", ["python", "bundle_a/run_bundle_a_tests.py"]),\n'
new_body = body + insertion
patched = src[:m.start(1)] + before + new_body + after + src[m.end(3):]

RUN_ALL.write_text(patched, encoding="utf-8")
print("Patched release_gate/run_all.py with Bundle A step. Backup saved as run_all.py.bak")
