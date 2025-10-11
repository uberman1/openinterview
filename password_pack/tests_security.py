import os, json, yaml, re
from playwright.sync_api import sync_playwright

def load_contract():
    with open("password_pack/contract.yml","r",encoding="utf-8") as f:
        return yaml.safe_load(f)

def run_security(base_url, contract, outdir, chromium_path=None):
    os.makedirs(outdir, exist_ok=True)
    results = {"issues": [], "status":"PASS"}
    with sync_playwright() as pw:
        launch_opts = {"headless": True}
        if chromium_path:
            launch_opts["executable_path"] = chromium_path
        browser = pw.chromium.launch(**launch_opts)
        context = browser.new_context()
        page = context.new_page()
        resp = page.goto(base_url + contract["url"])
        headers = {k.lower(): v for k,v in (resp.headers.items() if resp else [])}
        html = page.content()

        if re.search(r'name=[\"\']csrf_token[\"\']', html, re.I) is None:
            results["issues"].append("Missing CSRF token input")

        allow_meta = bool(contract.get("headers",{}).get("allow_meta_csp", True))
        csp_header = "content-security-policy" in headers
        csp_meta = re.search(r'Content-Security-Policy', html, re.I) is not None
        if contract.get("headers",{}).get("expect_csp", False) and not (csp_header or (allow_meta and csp_meta)):
            results["issues"].append("CSP not found in headers or meta")

        if results["issues"]:
            results["status"]="FAIL"

        context.close()
        browser.close()

    with open(os.path.join(outdir,"security.json"),"w",encoding="utf-8") as f:
        json.dump(results,f,indent=2)
    with open(os.path.join(outdir,"security.txt"),"w",encoding="utf-8") as f:
        f.write(json.dumps(results,indent=2))
    return results
