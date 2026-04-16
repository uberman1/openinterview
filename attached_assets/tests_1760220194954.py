
import json, pathlib
from playwright.sync_api import sync_playwright, expect
from .helpers import artifacts_dir, mirror_state_into_localstorage

VERSION = "v0.1.1"
def _result(status, details): return {"status": status, "details": details}

def run_contract(page, results):
    for sel in ["#email","#invite","#signup_btn","#verify_group","#code","#verify_btn","#session_btn","#logout_btn","#status"]:
        expect(page.locator(sel)).to_be_attached()
    results["contract"] = _result("PASS", {"selectors": 9})

def run_behavior(page, results):
    # Force binder to use SAME ORIGIN
    page.add_init_script("localStorage.setItem('qa_api_base', 'http://localhost:8000');")
    mirror_state_into_localstorage(page)
    page.goto("http://localhost:8000/public/auth_test.html")
    page.locator("#email").fill("qa_tester@example.com")
    page.locator("#invite").fill("ALPHA2025")
    with page.expect_response(lambda r: r.url.endswith("/api/auth/signup") and r.status == 200, timeout=8000):
        page.locator("#signup_btn").click()
    expect(page.locator("#verify_group")).to_be_visible()
    results["behavior"] = _result("PASS", {"flows": ["signup","verify_group_visible"]})

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
    artefacts = artifacts_dir(VERSION)
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"], headless=True)
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
