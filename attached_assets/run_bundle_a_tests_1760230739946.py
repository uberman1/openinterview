#!/usr/bin/env python3
import json, sys

def main():
    import bundle_a.tests_api.security_test as sec
    import bundle_a.tests_api.stripe_test as st
    import bundle_a.tests_api.notify_test as nt

    agg = {
        "auth_hardening_v0_2_0": sec.run(),
        "stripe_live_ready_v0_2_0": st.run(),
        "notify_provider_ready_v0_2_0": nt.run(),
    }
    failed = any(v == "FAIL"
                 for pack in agg.values()
                 for v in pack.values()
                 if isinstance(v, str))
    print(json.dumps(agg, indent=2))
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
