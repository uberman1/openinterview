import os, json, yaml
from playwright.sync_api import sync_playwright

def load_contract():
    with open("password_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_workflows(base_url, contract, outdir):
    os.makedirs(outdir, exist_ok=True)
    results = {"workflows": [], "responsive": [], "status":"PASS"}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(); context = browser.new_context(); page = context.new_page()

        for wf in contract.get("workflows", []):
            wf_res = {"id": wf["id"], "steps": [], "status":"PASS"}
            try:
                for step in wf.get("steps", []):
                    if "visit" in step: page.goto(base_url + step["visit"]); wf_res["steps"].append({"visit": step["visit"]})
                    elif "type" in step:
                        sel = step["type"]["selector"]; txt = step["type"]["text"]; page.fill(sel, txt); wf_res["steps"].append({"type": {"selector": sel}})
                    elif "wait_for" in step:
                        sel = step["wait_for"]["selector"]; timeout = step["wait_for"].get("timeout_ms", 2000); page.wait_for_selector(sel, timeout=timeout); wf_res["steps"].append({"wait_for": sel})
                    elif "click" in step: sel = step["click"]; page.click(sel); wf_res["steps"].append({"click": sel})
                    elif "expect_url_contains" in step:
                        substr = step["expect_url_contains"]
                        if substr not in page.url: raise AssertionError(f"URL expectation failed: {substr} not in {page.url}")
                        wf_res["steps"].append({"expect_url_contains": substr})
            except Exception as e:
                wf_res["status"]="FAIL"; wf_res["error"]=str(e); results["status"]="FAIL"
            results["workflows"].append(wf_res)

        for vp in contract.get("responsive",{}).get("viewports",[]):
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]}); page.goto(base_url + contract["url"])
            ok=True
            for item in contract.get("dom",{}).get("must_exist",[]):
                try: page.wait_for_selector(item["css"], timeout=1500)
                except Exception: ok=False; break
            results["responsive"].append({"viewport": vp, "status": "PASS" if ok else "FAIL"})
            if not ok: results["status"]="FAIL"

        context.close(); browser.close()

    with open(os.path.join(outdir,"behavior.json"),"w",encoding="utf-8") as f: json.dump(results,f,indent=2)
    with open(os.path.join(outdir,"behavior.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(results,indent=2))
    return results