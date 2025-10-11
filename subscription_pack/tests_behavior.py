import os, json, yaml
from playwright.sync_api import sync_playwright

USE_MOCK = os.environ.get("STRIPE_MOCK") == "1"
if USE_MOCK:
    from subscription_pack.mock_stripe import create_checkout_session, emit_webhook

STATE_DIR = os.path.join("qa","_state")
STATE_PATH = os.path.join(STATE_DIR,"session.json")

def load_contract():
    with open("subscription_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def merge_state(patch):
    os.makedirs(STATE_DIR, exist_ok=True)
    state = {}
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH,"r",encoding="utf-8") as f: state = json.load(f)
        except Exception:
            state = {}
    for k,v in patch.items():
        if isinstance(v, dict):
            state[k] = { **state.get(k, {}), **v }
        else:
            state[k] = v
    with open(STATE_PATH,"w",encoding="utf-8") as f: json.dump(state, f, indent=2)

def run_workflows(base_url, contract, outdir, chromium_path=None):
    os.makedirs(outdir, exist_ok=True)
    results = {"workflows": [], "responsive": [], "status":"PASS"}

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
                        page.goto(base_url + step["visit"])
                        wf_res["steps"].append({"visit": step["visit"]})
                    elif "type" in step:
                        sel = step["type"]["selector"]; txt = step["type"]["text"]
                        page.fill(sel, txt); wf_res["steps"].append({"type": {"selector": sel}})
                    elif "wait_for" in step:
                        sel = step["wait_for"]["selector"]; timeout = step["wait_for"].get("timeout_ms", 3000)
                        page.wait_for_selector(sel, state="attached", timeout=timeout); wf_res["steps"].append({"wait_for": sel})
                    elif "click" in step:
                        sel = step["click"]
                        if USE_MOCK and wf["id"] == "SB-PURCHASE-HAPPY" and ".select-plan" in sel:
                            try:
                                sess = create_checkout_session(price_id="price_test_pro")
                                page.goto(base_url + sess["url"])
                                _ = emit_webhook("checkout.session.completed", {"mode": "subscription", "status": "complete", "price": "price_test_pro"})
                            except Exception:
                                page.click(sel)
                        else:
                            page.click(sel)
                        wf_res["steps"].append({"click": sel})
                    elif "expect_url_contains" in step:
                        substr = step["expect_url_contains"]
                        if substr not in page.url: raise AssertionError(f"URL expectation failed: {substr} not in {page.url}")
                        wf_res["steps"].append({"expect_url_contains": substr})
            except Exception as e:
                wf_res["status"]="FAIL"; wf_res["error"]=str(e); results["status"]="FAIL"; all_ok=False
            results["workflows"].append(wf_res)

        # responsive checks on the subscription page only
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

    if all_ok:
        from datetime import datetime, timezone
        merge_state({"subscription": {"status": "active", "plan": "pro", "timestamp": datetime.now(timezone.utc).isoformat()}})

    with open(os.path.join(outdir,"behavior.json"),"w",encoding="utf-8") as f: json.dump(results,f,indent=2)
    with open(os.path.join(outdir,"behavior.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(results,indent=2))
    return results
