import json
from notify_pack.tests import run_all

if __name__ == "__main__":
    res = run_all()
    print(json.dumps(res, indent=2))
