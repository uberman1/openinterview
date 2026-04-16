import os, json, yaml, requests
from bs4 import BeautifulSoup

def load_contract():
    with open("profiles_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_contract(base_url, contract, outdir):
    os.makedirs(outdir, exist_ok=True)
    res = {"status":"PASS", "checks":[]}

    html = requests.get(base_url + contract["url"]).text
    soup = BeautifulSoup(html, "html.parser")
    for item in contract.get("dom",{}).get("must_exist",[]):
        sel = item["css"]
        ok = bool(soup.select(sel))
        res["checks"].append({"css": sel, "status": "PASS" if ok else "FAIL"})
        if not ok: res["status"] = "FAIL"

    with open(os.path.join(outdir,"contract.json"),"w",encoding="utf-8") as f: json.dump(res,f,indent=2)
    with open(os.path.join(outdir,"contract.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(res,indent=2))
    return res
