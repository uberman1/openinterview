#!/usr/bin/env python3
import sys, json
from auth_pack_v0_2_0.tests import run

def main():
    result = run()
    print(json.dumps(result, indent=2))
    failed = any(v == "FAIL" for v in result.values() if isinstance(v, str))
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
