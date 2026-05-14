import json, pathlib, re, subprocess
from playwright.sync_api import sync_playwright, expect
from .helpers import artifacts_dir, mirror_state_into_localstorage

VERSION = "v0.1.0"
def _result(status, details): return {"status": status, "details": details}

def run_contract(page, results):
    page.goto("http://localhost:8000/public/notify_test.html")
    for sel in ["#h1","#email","#send_otp_btn","#send_generic_btn","#status","#outbox_list"]:
        expect(page.locator(sel)).to_be_attached()
    results["contract"] = _result("PASS", {"selectors": 6})

def run_behavior(page, results):
    mirror_state_into_localstorage(page)
    page.goto("http://localhost:8000/public/notify_test.html")
    with page.expect_response(lambda r: r.url.endswith("/api/notify/otp") and r.status == 200, timeout=8000):
        page.locator("#send_otp_btn").click()
    expect(page.locator("#status")).to_have_text(re.compile("OTP sent|queued", re.I))
    with page.expect_response(lambda r: r.url.endswith("/api/notify/send") and r.status == 200, timeout=8000):
        page.locator("#send_generic_btn").click()
    expect(page.locator("#status")).to_have_text(re.compile("queued|Email queued", re.I))
    results["behavior"] = _result("PASS", {"flows": ["otp", "generic"]})

def run_a11y(page, results):
    page.goto("http://localhost:8000/public/notify_test.html")
    html = page.content()
    assert 'role="status"' in html
    results["a11y"] = _result("PASS", {"live_region": True})

def run_security(page, results):
    page.goto("http://localhost:8000/public/notify_test.html")
    html = page.content()
    assert "Content-Security-Policy" in html
    # sanity: no clear-text email in DOM by default
    assert "qa_tester@example.com" not in html
    results["security"] = _result("PASS", {"csp_meta": True})

def run_visual(page, results, artefacts):
    page.goto("http://localhost:8000/public/notify_test.html")
    path = artefacts / "baselines" / "notify-default.png"
    page.screenshot(path=str(path), full_page=True)
    results["visual"] = _result("PASS", {"baseline": str(path)})

def update_index(version: str, artefacts):
    # best-effort append into Notifications section if present
    p = pathlib.Path("public/test2.html")
    if not p.exists(): return
    html = p.read_text()
    if 'id="notifications-section"' not in html:
        return
    row = f"""<tr>
<td>{version}</td>
<td>Notifications & Email tests (mock mode). Validated OTP and generic send.</td>
<td><a href="/public/notify_test.html">/public/notify_test.html</a></td>
<td><a href="/qa/notify/{version}/tests.json">tests.json</a></td>
<td><a href="/qa/notify/{version}/tests.txt">tests.txt</a></td>
</tr>"""
    if row not in html:
        html = html.replace("</tbody>", row + "\n</tbody>", 1)
        p.write_text(html)

def run_all():
    chromium_path = subprocess.run(["which", "chromium"], capture_output=True, text=True).stdout.strip()
    if not chromium_path:
        raise RuntimeError("System chromium not found. Install via: nix-env -iA nixpkgs.chromium")
    
    artefacts = artifacts_dir(VERSION)
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chromium_path, args=["--no-sandbox"], headless=True)
        page = browser.new_page()
        run_contract(page, results)
        run_behavior(page, results)
        run_a11y(page, results)
        run_security(page, results)
        run_visual(page, results, artefacts)
        browser.close()
    (artefacts / "tests.json").write_text(json.dumps(results, indent=2))
    (artefacts / "tests.txt").write_text("\n".join([f"{k}: {v['status']}" for k,v in results.items()]))
    update_index(VERSION, artefacts)
    return results

if __name__ == "__main__":
    print(json.dumps(run_all(), indent=2))
