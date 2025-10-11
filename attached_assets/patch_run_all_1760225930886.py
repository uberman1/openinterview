#!/usr/bin/env python3
import subprocess, json, sys

STEPS = [
    ("auth_hardening_v0_2_0", ["python", "auth_pack_v0_2_0/run.py"]),
    ("stripe_live_ready_v0_2_0", ["python", "subscription_pack_v0_2_0/run.py"]),
    ("notify_provider_ready_v0_2_0", ["python", "notify_pack_v0_2_0/run.py"]),
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
            agg[name] = {"error": e.output.decode()}
        except Exception as e:
            failed = True
            agg[name] = {"error": str(e)}
    for name, res in agg.items():
        if any(v == "FAIL" for v in res.values() if isinstance(v, str)):
            failed = True
    print(json.dumps(agg, indent=2))
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
