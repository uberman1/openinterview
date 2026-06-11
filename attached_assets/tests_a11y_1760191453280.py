import os, json, yaml
from playwright.sync_api import sync_playwright

def load_contract():
    with open("password_pack/contract.yml","r",encoding="utf-8") as f:
        return yaml.safe_load(f)

def run_a11y(base_url, contract, outdir):
    os.makedirs(outdir, exist_ok=True)
    results = {"violations": [], "status":"PASS"}
    limits = contract.get("a11y", {})
    max_serious = int(limits.get("max_serious", 0))
    max_critical = int(limits.get("max_critical", 0))

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        page.goto(base_url + contract["url"])

        # inject axe
        page.add_script_tag(url="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js")
        violations = page.evaluate('(async () => { if (!window.axe) return [{id:"axe-missing", impact:"critical", description:"axe-core not loaded", nodes:[]}]; const r = await window.axe.run(); return r.violations.map(v => ({ id: v.id, impact: v.impact || "minor", description: v.description, nodes: v.nodes.map(n => n.target.join(" ")) })); })()')

        results["violations"] = violations
        serious = sum(1 for v in violations if v.get("impact")=="serious")
        critical = sum(1 for v in violations if v.get("impact")=="critical")
        if serious > max_serious or critical > max_critical:
            results["status"]="FAIL"

        context.close()
        browser.close()

    with open(os.path.join(outdir,"a11y.json"),"w",encoding="utf-8") as f:
        json.dump(results,f,indent=2)
    with open(os.path.join(outdir,"a11y.txt"),"w",encoding="utf-8") as f:
        f.write(json.dumps(results,indent=2))
    return results