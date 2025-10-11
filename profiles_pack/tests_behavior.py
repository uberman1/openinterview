import os, json, yaml, time
from playwright.sync_api import sync_playwright
from profiles_pack.helpers import prereq_subscription_active

def load_contract():
    with open("profiles_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_workflows(base_url, contract, outdir, chromium_path=None):
    os.makedirs(outdir, exist_ok=True)
    results = {"workflows": [], "responsive": [], "console_errors": [], "status":"PASS"}

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
        context = browser.new_context(permissions=["clipboard-read","clipboard-write"])
        page = context.new_page()

        # Capture console errors
        page.on("console", lambda msg: results["console_errors"].append(str(msg)) if msg.type=="error" else None)

        all_ok = True
        for wf in contract.get("workflows", []):
            wf_res = {"id": wf["id"], "steps": [], "status":"PASS"}
            try:
                for step in wf.get("steps", []):
                    if "visit" in step:
                        page.goto(base_url + step["visit"]); wf_res["steps"].append({"visit": step["visit"]})
                    elif "click" in step:
                        sel = step["click"]; page.click(sel); wf_res["steps"].append({"click": sel})
                    elif "fill" in step:
                        sel = step["fill"]["selector"]; val = step["fill"]["value"]
                        page.fill(sel, val); wf_res["steps"].append({"fill": { "selector": sel, "value": val }})
                    elif "wait_for_text" in step:
                        p = step["wait_for_text"]; sel = p["selector"]; contains = p["contains"]; timeout = p.get("timeout_ms",3000)
                        page.wait_for_selector(sel, timeout=timeout)
                        txt = page.inner_text(sel)
                        if contains not in txt: raise AssertionError(f"{contains} not in {txt}")
                        wf_res["steps"].append({"wait_for_text": contains})
                    elif "wait_for_selector" in step:
                        p = step["wait_for_selector"]; sel = p["selector"]; timeout = p.get("timeout_ms",3000)
                        page.wait_for_selector(sel, timeout=timeout); wf_res["steps"].append({"wait_for_selector": sel})
                    elif "sleep_ms" in step:
                        time.sleep(step["sleep_ms"]/1000.0); wf_res["steps"].append({"sleep_ms": step["sleep_ms"]})
                    elif "expect_visible" in step:
                        sel = step["expect_visible"]["selector"]
                        box = page.locator(sel).bounding_box()
                        if not (box and box["width"]>0 and box["height"]>0): raise AssertionError(f"{sel} not visible")
                        wf_res["steps"].append({"expect_visible": sel})
                    elif "expect_row_count_gte" in step:
                        p = step["expect_row_count_gte"]; sel = p["selector"]; count = page.locator(sel).count()
                        if count < p["count"]: raise AssertionError(f"{sel} row count {count} < {p['count']}")
                        wf_res["steps"].append({"expect_row_count_gte": { "selector": sel, "count": p["count"] }})
            except Exception as e:
                wf_res["status"]="FAIL"; wf_res["error"]=str(e); results["status"]="FAIL"; all_ok=False
            results["workflows"].append(wf_res)

        # responsive checks
        for vp in contract.get("responsive",{}).get("viewports",[]):
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.goto(base_url + contract["url"])
            ok=True
            try:
                page.wait_for_selector("table#profiles_table", timeout=3000)
                box = page.locator("table#profiles_table").bounding_box()
                ok = bool(box and box["width"]>0 and box["height"]>0)
            except Exception:
                ok=False
            results["responsive"].append({"viewport": vp, "status": "PASS" if ok else "FAIL"})
            if not ok: results["status"]="FAIL"; all_ok=False

        context.close(); browser.close()

    with open(os.path.join(outdir,"behavior.json"),"w",encoding="utf-8") as f: json.dump(results,f,indent=2)
    with open(os.path.join(outdir,"behavior.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(results,indent=2))
    return results
