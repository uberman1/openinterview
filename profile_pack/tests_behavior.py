import os, json, yaml
from playwright.sync_api import sync_playwright
from profile_pack.helpers import prereq_subscription_active

def load_contract():
    with open("profile_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_workflows(base_url, contract, outdir, chromium_path=None):
    os.makedirs(outdir, exist_ok=True)
    results = {"workflows": [], "responsive": [], "status":"PASS"}

    # Enforce prereq: subscription must be active
    if not prereq_subscription_active():
        results["status"] = "BLOCKED"
        results["reason"] = "subscription not active (qa/_state/session.json)"
        with open(os.path.join(outdir,"behavior.json"),"w",encoding="utf-8") as f: json.dump(results,f,indent=2)
        with open(os.path.join(outdir,"behavior.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(results,indent=2))
        return results

    with sync_playwright() as pw:
        launch_opts = {"headless": True}
        if chromium_path: launch_opts["executable_path"] = chromium_path
        browser = pw.chromium.launch(**launch_opts)
        context = browser.new_context()
        page = context.new_page()

        all_ok = True
        for wf in contract.get("workflows", []):
            wf_res = {"id": wf["id"], "steps": [], "status":"PASS"}
            try:
                for step in wf.get("steps", []):
                    if "visit" in step:
                        page.goto(base_url + step["visit"]); wf_res["steps"].append({"visit": step["visit"]})
                    elif "click" in step:
                        sel = step["click"]; page.click(sel); wf_res["steps"].append({"click": sel})
                    elif "wait_for_text" in step:
                        p = step["wait_for_text"]; sel = p["selector"]; contains = p["contains"]; timeout = p.get("timeout_ms",3000)
                        page.wait_for_selector(sel, timeout=timeout)
                        txt = page.inner_text(sel)
                        if contains not in txt: raise AssertionError(f"{contains} not in {txt}")
                        wf_res["steps"].append({"wait_for_text": contains})
                    elif "expect_has_class" in step:
                        p = step["expect_has_class"]; sel = p["selector"]; cls = p["class"]
                        page.wait_for_selector(sel, timeout=3000)
                        classes = page.get_attribute(sel, "class") or ""
                        if cls not in classes.split(): raise AssertionError(f"{sel} missing class {cls}")
                        wf_res["steps"].append({"expect_has_class": {"selector": sel, "class": cls}})
            except Exception as e:
                wf_res["status"]="FAIL"; wf_res["error"]=str(e); results["status"]="FAIL"; all_ok=False
            results["workflows"].append(wf_res)

        # responsive checks
        for vp in contract.get("responsive",{}).get("viewports",[]):
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.goto(base_url + contract["url"])
            ok=True
            for item in contract.get("dom",{}).get("must_exist",[]):
                try:
                    page.wait_for_selector(item["css"], state="attached", timeout=3000)
                except Exception:
                    ok=False; break
            results["responsive"].append({"viewport": vp, "status": "PASS" if ok else "FAIL"})
            if not ok: results["status"]="FAIL"; all_ok=False

        context.close(); browser.close()

    with open(os.path.join(outdir,"behavior.json"),"w",encoding="utf-8") as f: json.dump(results,f,indent=2)
    with open(os.path.join(outdir,"behavior.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(results,indent=2))
    return results
