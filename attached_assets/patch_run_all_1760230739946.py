#!/usr/bin/env python3
import subprocess, json, sys

STEPS = [
    ("bundle_a_v0_2_0", ["python", "bundle_a/run_bundle_a_tests.py"]),
]

def main():
    failed = False
    agg = {}
    for name, cmd in STEPS:
        print(f"[bundle-a] running {name}: {' '.join(cmd)}")
        try:
            out = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode()
            print(out)
            agg[name] = json.loads(out)
        except subprocess.CalledProcessError as e:
            failed = True
            try:
                agg[name] = json.loads(e.output.decode())
            except Exception:
                agg[name] = {"error": e.output.decode()}
        except Exception as e:
            failed = True
            agg[name] = {"error": str(e)}
    for name, res in agg.items():
        if isinstance(res, dict):
            for v in res.values():
                if isinstance(v, dict):
                    if any(x == "FAIL" for x in v.values() if isinstance(x, str)):
                        failed = True
    print(json.dumps(agg, indent=2))
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
