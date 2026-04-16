
from playwright.sync_api import sync_playwright

TARGETS = [
    "/home_test.html",
    "/password_reset.html",
    "/subscription_test.html",
    "/availability_test.html",
    "/shareable_profile_test.html",
    "/profiles_test.html",
    "/uploads_test.html",
]

# lenient thresholds in ms
MAX_DCL = 2500
MAX_LOAD = 3500

def main(base_url, outdir):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        page = ctx.new_page()
        for path in TARGETS:
            page.goto(base_url + path, wait_until="load")
            nav = page.evaluate("performance.getEntriesByType('navigation')[0]")
            dcl = nav.get("domContentLoadedEventEnd", 0) if nav else 0
            load = nav.get("loadEventEnd", 0) if nav else 0
            if (dcl and dcl > MAX_DCL) or (load and load > MAX_LOAD):
                return {"status":"FAIL","page":path,"dcl":dcl,"load":load}
        browser.close()
    return {"status":"PASS","thresholds":{"dcl":MAX_DCL,"load":MAX_LOAD}}
