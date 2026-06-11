#!/usr/bin/env python3
import json, os, pathlib, datetime, sys
from stage6.tests_api.stripe_sandbox_test import run as stripe_run
from stage6.tests_api.notify_sandbox_test import run as notify_run

def main():
    results = {
        "stage6_v0_6_0": {},
        "status": "PASS",
        "timestamp": datetime.datetime.utcnow().isoformat()+"Z"
    }
    try:
        results["stage6_v0_6_0"]["stripe_sandbox"] = stripe_run()
        if results["stage6_v0_6_0"]["stripe_sandbox"].get("status") != "PASS":
            results["status"] = "FAIL"
    except Exception as e:
        results["stage6_v0_6_0"]["stripe_sandbox"] = {"status":"ERROR","error":str(e)}
        results["status"] = "FAIL"

    try:
        results["stage6_v0_6_0"]["notify_sandbox"] = notify_run()
        if results["stage6_v0_6_0"]["notify_sandbox"].get("status") != "PASS":
            results["status"] = "FAIL"
    except Exception as e:
        results["stage6_v0_6_0"]["notify_sandbox"] = {"status":"ERROR","error":str(e)}
        results["status"] = "FAIL"

    outdir = pathlib.Path("qa/stage6/v0.6.0")
    outdir.mkdir(parents=True, exist_ok=True)
    with open(outdir/"tests.json","w",encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    with open(outdir/"tests.txt","w",encoding="utf-8") as f:
        f.write("Stage 6 v0.6.0 Results\n")
        f.write(json.dumps(results, indent=2))

    print(json.dumps(results, indent=2))
    sys.exit(0 if results["status"]=="PASS" else 1)

if __name__ == "__main__":
    main()
