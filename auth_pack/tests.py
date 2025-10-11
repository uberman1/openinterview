
import json, pathlib
from playwright.sync_api import sync_playwright, expect
from .helpers import artifacts_dir, mirror_state_into_localstorage

VERSION = "v0.1.0"
def _result(status, details): return {"status": status, "details": details}

def run_contract(page, results):
    page.goto("http://localhost:8000/public/auth_test.html")
    for sel in ["#email","#invite","#signup_btn","#verify_group","#code","#verify_btn","#session_btn","#logout_btn","#status"]:
        expect(page.locator(sel)).to_be_attached()
    results["contract"] = _result("PASS", {"selectors": 9})

def run_behavior(page, results):
    page.add_init_script("localStorage.setItem('qa_health_url', 'http://127.0.0.1:8000/health');")
    mirror_state_into_localstorage(page)
    page.goto("http://localhost:8000/public/auth_test.html")
    page.locator("#email").fill("qa_tester@example.com")
    page.locator("#invite").fill("ALPHA2025")
    page.locator("#signup_btn").click()
    expect(page.locator("#verify_group")).to_be_visible(timeout=10000)
    page.locator("#code").fill("123456")
    page.locator("#verify_btn").click()
    expect(page.locator("#status")).to_contain_text("Logged in", timeout=10000)
    results["behavior"] = _result("PASS", {"flows": ["signup","verify","login"]})

def run_a11y(page, results):
    page.goto("http://localhost:8000/public/auth_test.html")
    assert "role=\"status\"" in page.content()
    results["a11y"] = _result("PASS", {"live_region": True})

def run_security(page, results):
    page.goto("http://localhost:8000/public/auth_test.html")
    assert "Content-Security-Policy" in page.content()
    results["security"] = _result("PASS", {"csp_meta": True})

def run_visual(page, results, artefacts):
    page.goto("http://localhost:8000/public/auth_test.html")
    bdir = artefacts / "baselines"; bdir.mkdir(parents=True, exist_ok=True)
    path = bdir / "auth-default.png"
    page.screenshot(path=str(path), full_page=True)
    results["visual"] = _result("PASS", {"baseline": str(path)})

def run_all():
    import subprocess
    chromium_path = subprocess.run(["which", "chromium"], capture_output=True, text=True).stdout.strip() or None
    
    artefacts = artifacts_dir(VERSION)
    results = {}
    with sync_playwright() as p:
        launch_opts = {"headless": True}
        if chromium_path:
            launch_opts["executable_path"] = chromium_path
        browser = p.chromium.launch(**launch_opts)
        page = browser.new_page()
        run_contract(page, results)
        run_behavior(page, results)
        run_a11y(page, results)
        run_security(page, results)
        run_visual(page, results, artefacts)
        browser.close()
    (artefacts / "tests.json").write_text(json.dumps(results, indent=2))
    (artefacts / "tests.txt").write_text("\n".join([f"{k}: {v['status']}" for k,v in results.items()]))
    return results

if __name__ == "__main__":
    print(json.dumps(run_all(), indent=2))
