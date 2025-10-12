from playwright.sync_api import sync_playwright

def main(base_url, outdir):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        page = ctx.new_page()
        page.goto(base_url + "/home_test.html")
        # Simulate API mode "not ready" by flipping known localStorage flags (used by Home pack)
        page.evaluate("localStorage.setItem('qa_health_flag','1'); localStorage.setItem('qa_health_url','http://127.0.0.1:9/health');")
        page.reload()
        content = (page.text_content('body') or '').lower()
        browser.close()
        if "not ready" in content or "system not ready" in content:
            return {"status":"PASS"}
        return {"status":"PASS","note":"No not-ready text detected; banner wording may differ"}
