import os, json, yaml
from playwright.sync_api import sync_playwright
from profiles_pack.helpers import ensure_dir

def load_contract():
    with open("profiles_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def run_visual(base_url, contract, outdir):
    os.makedirs(outdir, exist_ok=True)
    results = {"shots": [], "status":"PASS"}

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        for item in contract.get("visual",{}).get("baselines",[]):
            target_url = item.get("url", contract["url"])
            vp = item.get("viewport", {"width":1280,"height":900})
            page.set_viewport_size(vp)
            page.goto(base_url + target_url)
            selector = item.get("selector","main")
            el = page.wait_for_selector(selector, timeout=3000)
            shot = el.screenshot()

            baseline_dir = os.path.join("qa","profiles",contract["version"],"baselines")
            ensure_dir(baseline_dir)
            bpath = os.path.join(baseline_dir, f"{item['name']}.png")

            if os.path.exists(bpath):
                with open(bpath,"rb") as f: existing = f.read()
                status = "PASS" if existing == shot else "FAIL"
                results["shots"].append({"name": item["name"], "url": target_url, "status": status})
                if status=="FAIL": results["status"]="FAIL"
            else:
                with open(bpath,"wb") as f: f.write(shot)
                results["shots"].append({"name": item["name"], "url": target_url, "baseline_created": True, "status":"WARN"})

        context.close(); browser.close()

    with open(os.path.join(outdir,"visual.json"),"w",encoding="utf-8") as f: json.dump(results,f,indent=2)
    with open(os.path.join(outdir,"visual.txt"),"w",encoding="utf-8") as f: f.write(json.dumps(results,indent=2))
    return results
