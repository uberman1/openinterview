import os, json, yaml, re

def load_contract():
    with open("subscription_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_contract(base_url, contract, outdir):
    os.makedirs(outdir, exist_ok=True)
    import requests
    from bs4 import BeautifulSoup
    res = {"status":"PASS", "checks":[]}

    for item in contract.get("dom",{}).get("must_exist",[]):
        url = base_url + contract["url"]
        html = requests.get(base_url + contract["url"]).text if "url" not in item else requests.get(base_url + item["url"]).text
        soup = BeautifulSoup(html, "html.parser")
        if not soup.select(item["css"]):
            res["status"] = "FAIL"
            res["checks"].append({"css": item["css"], "status":"FAIL"})
        else:
            res["checks"].append({"css": item["css"], "status":"PASS"})

    with open(os.path.join(outdir,"contract.json"),"w",encoding="utf-8") as f: json.dump(res,f,indent=2)
    with open(os.path.join(outdir,"contract.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(res,indent=2))
    return res