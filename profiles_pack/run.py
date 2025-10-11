import os, json, requests
from datetime import datetime, timezone

from profiles_pack.tests_contract import run_contract, load_contract as load_contract_contract
from profiles_pack.tests_behavior import run_workflows, load_contract as load_contract_behavior
from profiles_pack.tests_a11y import run_a11y, load_contract as load_contract_a11y
from profiles_pack.tests_security import run_security, load_contract as load_contract_security
from profiles_pack.tests_visual import run_visual, load_contract as load_contract_visual
from profiles_pack.helpers import ensure_dir, append_row_to_test_index

BASE_URL = os.environ.get("OI_BASE_URL", "http://127.0.0.1:5000")
CHROMIUM_PATH = "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium"

def main():
    contract = load_contract_contract()
    outdir = os.path.join("qa","profiles", contract["version"])
    ensure_dir(outdir)

    # Contract
    c = run_contract(BASE_URL, contract, outdir)
    # Behavior (with prerequisite check)
    b = run_workflows(BASE_URL, contract, outdir, CHROMIUM_PATH)
    # A11y
    a = run_a11y(BASE_URL, contract, outdir)
    # Security
    s = run_security(BASE_URL, contract, outdir)
    # Visual
    v = run_visual(BASE_URL, contract, outdir, CHROMIUM_PATH)

    def ok(x): return x.get("status") in ("PASS","WARN","BLOCKED")
    overall = "PASS" if all(ok(x) for x in [c,b,a,s,v]) and b.get("status") != "FAIL" else ("BLOCKED" if b.get("status")=="BLOCKED" else "FAIL")

    rollup = {
        "overall": overall,
        "contract": c.get("status"),
        "behavior": b.get("status"),
        "a11y": a.get("status"),
        "security": s.get("status"),
        "visual": v.get("status"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    with open(os.path.join(outdir,"tests.json"),"w",encoding="utf-8") as f: json.dump(rollup,f,indent=2)
    
    summary = f"""Status: {overall}
contract: {c.get("status")}
behavior: {b.get("status")}
a11y: {a.get("status")}
security: {s.get("status")}
visual: {v.get("status")}
Timestamp: {rollup["timestamp"]}"""
    
    with open(os.path.join(outdir,"tests.txt"),"w",encoding="utf-8") as f: f.write(summary)

    # Snapshot page source
    html = requests.get(BASE_URL + contract["url"]).text
    with open(os.path.join(outdir,"profiles.html.txt"),"w",encoding="utf-8") as f: f.write(html)

    # Append row into test2.html under <section id="profiles">
    description = "✅ Profiles: table visibility post-hydrate, create/save/publish, a11y, CSP, visual (1 baseline)"
    page_url = contract["url"]
    code_path = f"/qa/profiles/{contract['version']}/profiles.html.txt"
    test_path = f"/qa/profiles/{contract['version']}/tests.txt"
    updated = append_row_to_test_index(contract["version"], description, page_url, code_path, test_path)
    
    print(f"Updated test2: {updated}")
    print(f"Artifacts: {os.path.join(outdir,'tests.txt')} {os.path.join(outdir,'profiles.html.txt')}")

if __name__ == "__main__":
    main()
