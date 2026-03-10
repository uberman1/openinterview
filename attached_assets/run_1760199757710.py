import os, json, requests
from profiles_pack.tests_contract import run_contract, load_contract as load_contract_c
from profiles_pack.tests_behavior import run_workflows, load_contract as load_contract_b
from profiles_pack.tests_a11y import run_a11y, load_contract as load_contract_a
from profiles_pack.tests_security import run_security, load_contract as load_contract_s
from profiles_pack.tests_visual import run_visual, load_contract as load_contract_v
from profiles_pack.helpers import ensure_dir, append_row_to_test_index

BASE_URL = os.environ.get("OI_BASE_URL", "http://127.0.0.1:8000")

def main():
    contract = load_contract_c()
    outdir = os.path.join("qa","profiles", contract["version"])
    ensure_dir(outdir)

    c = run_contract(BASE_URL, contract, outdir)
    b = run_workflows(BASE_URL, contract, outdir)
    a = run_a11y(BASE_URL, contract, outdir)
    s = run_security(BASE_URL, contract, outdir)
    v = run_visual(BASE_URL, contract, outdir)

    def ok(x): return x.get("status") in ("PASS","WARN","BLOCKED")
    overall = "PASS" if all(ok(x) for x in [c,b,a,s,v]) and b.get("status") != "FAIL" else ("BLOCKED" if b.get("status")=="BLOCKED" else "FAIL")

    rollup = {"overall": overall, "contract": c.get("status"), "behavior": b.get("status"), "a11y": a.get("status"), "security": s.get("status"), "visual": v.get("status")}
    with open(os.path.join(outdir,"tests.json"),"w",encoding="utf-8") as f: json.dump(rollup,f,indent=2)
    with open(os.path.join(outdir,"tests.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(rollup,indent=2))

    html = requests.get(BASE_URL + contract["url"]).text
    with open(os.path.join(outdir,"profiles.html.txt"),"w",encoding="utf-8") as f: f.write(html)

    description = "Profiles: table visibility post-hydrate, create/save/publish, a11y, CSP, visual baseline"
    page_url = contract["url"]
    code_path = f"/qa/profiles/{contract['version']}/profiles.html.txt"
    test_path = f"/qa/profiles/{contract['version']}/tests.txt"
    append_row_to_test_index(contract["version"], description, page_url, code_path, test_path)

    print(json.dumps(rollup, indent=2))

if __name__ == "__main__":
    main()
