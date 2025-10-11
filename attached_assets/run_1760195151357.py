import os, json, sys, yaml

from subscription_pack.tests_contract import run_contract, load_contract as load_contract_contract
from subscription_pack.tests_behavior import run_workflows, load_contract as load_contract_behavior
from subscription_pack.tests_a11y import run_a11y, load_contract as load_contract_a11y
from subscription_pack.tests_security import run_security, load_contract as load_contract_security
from subscription_pack.tests_visual import run_visual, load_contract as load_contract_visual
from subscription_pack.helpers import ensure_dir, append_row_to_test_index

BASE_URL = os.environ.get("OI_BASE_URL", "http://127.0.0.1:8000")

def main():
    contract = load_contract_contract()
    outdir = os.path.join("qa","subscription", contract["version"])
    ensure_dir(outdir)

    # Contract
    c = run_contract(BASE_URL, contract, outdir)
    # Behavior
    b = run_workflows(BASE_URL, contract, outdir)
    # A11y
    a = run_a11y(BASE_URL, contract, outdir)
    # Security
    s = run_security(BASE_URL, contract, outdir)
    # Visual
    v = run_visual(BASE_URL, contract, outdir)

    overall = "PASS" if all(x.get("status") == "PASS" or x.get("status") == "WARN" for x in [c,b,a,s,v]) else "FAIL"
    rollup = {
        "overall": overall,
        "contract": c.get("status"),
        "behavior": b.get("status"),
        "a11y": a.get("status"),
        "security": s.get("status"),
        "visual": v.get("status"),
    }
    with open(os.path.join(outdir,"tests.json"),"w",encoding="utf-8") as f: json.dump(rollup,f,indent=2)
    with open(os.path.join(outdir,"tests.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(rollup,indent=2))

    # Snapshot page source for code link
    import requests
    html = requests.get(BASE_URL + contract["url"]).text
    with open(os.path.join(outdir,"subscription.html.txt"),"w",encoding="utf-8") as f: f.write(html)

    # Append row into test2.html under <section id="subscription">
    description = "Subscription page tested: plans, flows (success/cancel), a11y, CSP, visual baselines"
    page_url = contract["url"]
    code_path = f"/qa/subscription/{contract['version']}/subscription.html.txt"
    test_path = f"/qa/subscription/{contract['version']}/tests.txt"
    append_row_to_test_index(contract["version"], description, page_url, code_path, test_path)

    print(json.dumps(rollup, indent=2))

if __name__ == "__main__":
    main()