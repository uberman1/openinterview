import os, json, yaml, re, requests

def load_contract():
    with open("subscription_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_security(base_url, contract, outdir):
    os.makedirs(outdir, exist_ok=True)
    res = {"status":"PASS","checks":[]}

    # CSP presence
    html = requests.get(base_url + contract["url"]).text
    csp_ok = ("Content-Security-Policy" in html) or ("http-equiv=\"Content-Security-Policy\"" in html)
    res["checks"].append({"csp": "present" if csp_ok else "missing"})
    if not csp_ok: res["status"]="FAIL"

    # No raw card numbers (simple heuristic: 13+ consecutive digits)
    if re.search(r"\b\d{13,}\b", html):
        res["checks"].append({"pan_leak": "detected"}); res["status"]="FAIL"
    else:
        res["checks"].append({"pan_leak": "none"})

    # Only last4 displayed for payment method
    last4 = re.findall(r"id=\"pm_last4\">(\d{4})<", html)
    if not last4:
        res["checks"].append({"last4": "missing"}); res["status"]="FAIL"
    else:
        res["checks"].append({"last4": last4[0]})

    with open(os.path.join(outdir,"security.json"),"w",encoding="utf-8") as f: json.dump(res,f,indent=2)
    with open(os.path.join(outdir,"security.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(res,indent=2))
    return res
