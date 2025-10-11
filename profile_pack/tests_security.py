import os, json, yaml, re, requests

def load_contract():
    with open("profile_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_security(base_url, contract, outdir):
    os.makedirs(outdir, exist_ok=True)
    res = {"status":"PASS","checks":[]}

    html = requests.get(base_url + contract["url"]).text

    csp_ok = ("Content-Security-Policy" in html) or ('http-equiv="Content-Security-Policy"' in html)
    res["checks"].append({"csp": "present" if csp_ok else "missing"})
    if not csp_ok: res["status"]="FAIL"

    # URL token leak check
    if re.search(r"[?&](token|auth|key)=", html, flags=re.I):
        res["checks"].append({"url_token_leak":"detected"}); res["status"]="FAIL"
    else:
        res["checks"].append({"url_token_leak":"none"})

    # Email leak check (crude PII guard)
    if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", html):
        res["checks"].append({"email_leak":"detected"}); res["status"]="FAIL"
    else:
        res["checks"].append({"email_leak":"none"})

    with open(os.path.join(outdir,"security.json"),"w",encoding="utf-8") as f: json.dump(res,f,indent=2)
    with open(os.path.join(outdir,"security.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(res,indent=2))
    return res
