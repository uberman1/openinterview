import os, json
from playwright.sync_api import sync_playwright, expect
from home_pack.helpers import ensure_dir, update_test_index

BASE_URL = os.environ.get("OI_BASE_URL", "http://127.0.0.1:8000")
HOME_API = os.environ.get("HOME_API", "0")  # '1' enables API-mode
HEALTH_URL = os.environ.get("HEALTH_URL")   # e.g., https://<preview>/health

def write(outdir, name, data):
    with open(os.path.join(outdir, name), "w", encoding="utf-8") as f:
        if isinstance(data, str):
            f.write(data)
        else:
            json.dump(data, f, indent=2)

def mirror_state(page):
    p = os.path.join('qa','_state','session.json')
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            state = f.read()
        page.evaluate("""(txt) => { try { localStorage.setItem('qa_state_mirror', txt); } catch(e){} }""", state)

def set_api_config(page):
    if HOME_API == "1" and HEALTH_URL:
        page.evaluate("""(url) => { 
            try { 
              localStorage.setItem('qa_health_flag','1'); 
              localStorage.setItem('qa_health_url', url);
            } catch(e){} 
        }""", HEALTH_URL)
    else:
        page.evaluate("""() => { 
            try { 
              localStorage.removeItem('qa_health_flag'); 
              localStorage.removeItem('qa_health_url');
            } catch(e){} 
        }""")    

def main():
    outdir = os.path.join("qa","home","v0.1.1")
    ensure_dir(outdir)
    baselinedir = os.path.join(outdir, "baselines")
    ensure_dir(baselinedir)

    roll = {"status":"PASS","suites":[],"version":"v0.1.1","api_mode": HOME_API=="1"}

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context()
        page = ctx.new_page()

        page.goto(BASE_URL + "/home_test.html")
        mirror_state(page)
        set_api_config(page)

        # Contract
        required = ["#content","#system_ready","#run_diag","#nav_password","#nav_subscription","#nav_availability","#nav_profiles","#nav_shareable","#nav_uploads"]
        for s in required:
            page.wait_for_selector(s, timeout=4000)
        roll["suites"].append({"contract":"PASS","count":len(required)})

        # Security
        html = page.content()
        assert "Content-Security-Policy" in html, "CSP missing"
        roll["suites"].append({"security":"PASS"})

        # A11y
        expect(page.locator("#system_ready")).to_have_attribute("role","status")
        expect(page.locator("main#content")).to_be_visible()
        roll["suites"].append({"a11y":"PASS"})

        # Behavior readiness (UI + optional API)
        page.click("#run_diag")
        label = page.text_content("#system_ready")
        assert label in ("System Ready","Not Ready"), "Readiness did not render expected labels"
        roll["suites"].append({"behavior-readiness":"PASS","label":label})

        # API-mode check if enabled: call health endpoint directly
        if HOME_API == "1" and HEALTH_URL:
            # Use APIRequestContext to verify endpoint
            req = ctx.request
            resp = req.get(HEALTH_URL)
            assert resp.ok, f"Health endpoint not OK: {resp.status}"
            try:
                data = resp.json()
            except Exception:
                data = {}
            ok = (data.get('status') == 'ok' or data.get('healthy') is True or data.get('ok') is True)
            assert ok, f"Health JSON not healthy: {data}"
            roll["suites"].append({"behavior-api-health":"PASS","url":HEALTH_URL,"data":data})

        # Behavior nav hrefs
        nav_ids = {
            "nav_password": "/password_reset.html",
            "nav_subscription": "/subscription_test.html",
            "nav_availability": "/availability_test.html",
            "nav_profiles": "/profiles_test.html",
            "nav_shareable": "/shareable_profile_test.html",
            "nav_uploads": "/uploads_test.html",
        }
        for nid, href in nav_ids.items():
            expect(page.locator(f"#{nid}")).to_have_attribute("href", href)
        roll["suites"].append({"behavior-nav-hrefs":"PASS","count":len(nav_ids)})

        # Visual
        page.screenshot(path=os.path.join(baselinedir,"home-default.png"), full_page=False)
        roll["suites"].append({"visual":"PASS","baseline":"home-default.png"})

        ctx.close(); browser.close()

    write(outdir, "tests.txt", roll)
    write(outdir, "tests.json", roll)
    write(outdir, "home.html.txt", "<snapshot marker>")

    # Update test2.html
    description = "Home QA surface: readiness banner + nav smoke + visual baseline + optional API-mode health"
    update_test_index("Home", "v0.1.1", description, "/home_test.html",
                      "/qa/home/v0.1.1/home.html.txt", "/qa/home/v0.1.1/tests.txt")

    print(json.dumps(roll, indent=2))

if __name__ == "__main__":
    main()
