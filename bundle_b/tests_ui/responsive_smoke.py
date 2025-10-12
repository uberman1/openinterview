from playwright.sync_api import sync_playwright

VIEWPORTS = [(375,812), (1280,900)]
TARGETS = [
    "/home_test.html",
    "/password_reset.html",
    "/subscription_test.html",
    "/availability_test.html",
    "/shareable_profile_test.html",
    "/profiles_test.html",
    "/uploads_test.html",
]

def main(base_url, outdir):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        page = ctx.new_page()
        for w,h in VIEWPORTS:
            page.set_viewport_size({"width":w,"height":h})
            for path in TARGETS:
                page.goto(base_url + path)
                scroll_w = page.evaluate("document.documentElement.scrollWidth")
                inner_w = page.evaluate("window.innerWidth")
                if scroll_w > inner_w * 1.02:  # allow tiny overflow
                    return {"status":"FAIL","viewport":[w,h],"page":path,"scrollWidth":scroll_w,"innerWidth":inner_w}
        browser.close()
    return {"status":"PASS"}
