import os, sys, json, yaml, datetime, re, subprocess

ARTIFACT_ROOT = "qa/password"

def load_contract():
    with open("password_pack/contract.yml","r",encoding="utf-8") as f: return yaml.safe_load(f)

def ensure_dirs(version):
    outdir = os.path.join(ARTIFACT_ROOT, version); os.makedirs(outdir, exist_ok=True); return outdir

def update_test2(section_id, version, description, page_url, code_url, tests_url, test2_path="test2.html"):
    try:
        with open(test2_path,"r",encoding="utf-8") as f: html=f.read()
    except Exception as e:
        print("WARN: cannot open test2.html:", e); return False
    m = re.search(rf'(<section id="{section_id}"[\s\S]*?<tbody>)([\s\S]*?)(</tbody>)', html, re.I)
    if not m: print("WARN: section not found:", section_id); return False
    row = f'<tr><td class="mono">{version}</td><td>Password Reset page tested (Option A, v0.1.4).</td><td><a href="{page_url}" target="_blank">open</a></td><td><a href="{code_url}" target="_blank">source.txt</a></td><td><a href="{tests_url}" target="_blank">tests.txt</a></td></tr>'
    new = m.group(1) + m.group(2) + row + m.group(3)
    html = html.replace(m.group(0), new)
    with open(test2_path,"w",encoding="utf-8") as f: f.write(html)
    return True

def consolidate_txt(outdir, status_map):
    status = 'PASS' if all(v in ('PASS','WARN') for v in status_map.values()) else 'FAIL'
    lines = [f"Status: {status}"] + [f"{k}: {v}" for k,v in status_map.items()] + ["Timestamp: " + datetime.datetime.utcnow().isoformat() + "Z"]
    path = os.path.join(outdir,"tests.txt")
    with open(path,"w",encoding="utf-8") as f: f.write("\n".join(lines))
    return path

def main():
    try:
        subprocess.run([sys.executable,"-m","playwright","install","--with-deps","chromium"], check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    except Exception as e:
        print("WARN: playwright install failed:", e)

    contract = load_contract(); version = contract["version"]; section_id = contract.get("section_id","password")
    outdir = ensure_dirs(version)

    base_url = os.environ.get("OI_BASE_URL","http://127.0.0.1:8000")
    page_fs_path = os.path.join("public","password_reset.html")

    # Grab rendered source and headers
    from playwright.sync_api import sync_playwright
    resp_headers = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(); ctx = browser.new_context(); page = ctx.new_page()
        r = page.goto(base_url + contract["url"])
        if r: resp_headers = r.headers
        html_now = page.content()
        os.makedirs(os.path.dirname(page_fs_path), exist_ok=True)
        with open(page_fs_path,"w",encoding="utf-8") as f: f.write(html_now)
        ctx.close(); browser.close()

    from password_pack.tests_contract import run as run_contract
    contract_res = run_contract(page_fs_path, {k.lower():v for k,v in resp_headers.items()}, contract, outdir)

    from password_pack.tests_behavior import run_workflows
    behavior_res = run_workflows(base_url, contract, outdir)

    from password_pack.tests_a11y import run_a11y
    a11y_res = run_a11y(base_url, contract, outdir)

    from password_pack.tests_security import run_security
    sec_res = run_security(base_url, contract, outdir)

    from password_pack.tests_visual import run_visual
    vis_res = run_visual(base_url, contract, outdir)

    from password_pack.helpers import snapshot_source
    snapshot_source(page_fs_path, os.path.join(outdir,"password.html.txt"))

    status_map = {"contract": contract_res["status"], "behavior": behavior_res["status"], "a11y": a11y_res["status"], "security": sec_res["status"], "visual": vis_res["status"]}
    tests_txt_path = consolidate_txt(outdir, status_map)

    updated = update_test2(section_id, version, "Password Reset page tested (Option A, v0.1.4).", contract["url"], f"/{outdir}/password.html.txt", f"/{outdir}/tests.txt", "test2.html")
    print("Updated test2:", updated); print("Artifacts:", tests_txt_path, os.path.join(outdir,"password.html.txt"))

if __name__ == "__main__":
    main()