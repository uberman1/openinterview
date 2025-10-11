import json, os, re, yaml

def load_contract():
    with open("password_pack/contract.yml","r",encoding="utf-8") as f:
        return yaml.safe_load(f)

def check_dom_selectors(html, selectors):
    failures = []
    for item in selectors:
        sel = item.get("css")
        id_m = re.search(r"#([A-Za-z0-9_\-:]+)", sel)
        attrs = re.findall(r'\[([^\]=]+)=\"([^\"]+)\"\]', sel)
        if id_m:
            if re.search(r'id=[\"\']'+re.escape(id_m.group(1))+r'[\"\']', html, re.I) is None:
                failures.append(f"Missing id #{id_m.group(1)} for selector: {sel}")
                continue
        for k,v in attrs:
            if re.search(rf'{re.escape(k)}=[\"\'{re.escape(v)}[\"\']', html, re.I) is None:
                failures.append(f"Missing attr [{k}=\"{v}\"] for selector: {sel}")
    return failures

def run(page_html_path, response_headers, contract, artifact_dir):
    dom = contract.get("dom",{})
    headers = contract.get("headers",{})
    results = {"dom": {"failures": []}, "headers": {"failures": []}, "status":"PASS"}

    html = ""
    try:
        with open(page_html_path,"r",encoding="utf-8") as f:
            html = f.read()
    except Exception as e:
        results["dom"]["failures"].append(f"READ_ERROR: {e}")

    if html:
        fails = check_dom_selectors(html, dom.get("must_exist",[]))
        results["dom"]["failures"].extend(fails)

    expect_csp = headers.get("expect_csp", False)
    allow_meta = headers.get("allow_meta_csp", True)
    csp_in_header = any(h.lower()=="content-security-policy" for h in response_headers.keys())
    csp_in_meta = re.search(r'Content-Security-Policy', html, re.I) is not None
    if expect_csp and not (csp_in_header or (allow_meta and csp_in_meta)):
        results["headers"]["failures"].append("CSP not found in response headers or meta")

    if results["dom"]["failures"] or results["headers"]["failures"]:
        results["status"]="FAIL"

    os.makedirs(artifact_dir, exist_ok=True)
    with open(os.path.join(artifact_dir,"contract.json"),"w",encoding="utf-8") as f:
        json.dump(results,f,indent=2)
    with open(os.path.join(artifact_dir,"contract.txt"),"w",encoding="utf-8") as f:
        f.write(json.dumps(results,indent=2))

    return results
