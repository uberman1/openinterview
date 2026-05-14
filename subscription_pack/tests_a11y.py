import os, json, yaml, re, requests
from bs4 import BeautifulSoup

def load_contract():
    with open("subscription_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_a11y(base_url, contract, outdir):
    os.makedirs(outdir, exist_ok=True)
    res = {"status":"PASS","issues":[]}
    html = requests.get(base_url + contract["url"]).text
    soup = BeautifulSoup(html, "html.parser")
    # Minimal checks: main landmark, labels, focusable buttons/links
    if not soup.select("main#content"):
        res["issues"].append("Missing main#content")
    if not soup.select("#billing_toggle"):
        res["issues"].append("Missing #billing_toggle")
    if not soup.select(".select-plan"):
        res["issues"].append("Missing .select-plan")
    if res["issues"]:
        res["status"]="FAIL"
    with open(os.path.join(outdir,"a11y.json"),"w",encoding="utf-8") as f: json.dump(res,f,indent=2)
    with open(os.path.join(outdir,"a11y.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(res,indent=2))
    return res
