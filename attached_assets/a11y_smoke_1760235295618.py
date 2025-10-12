
from playwright.sync_api import sync_playwright

PAGES = [
    ("/home_test.html", {"expect":[("css=main[role=main]", True),
                                   ("css=[role=status][aria-live=polite]", True)]}),
    ("/password_reset.html", {"expect":[("css=form", True),
                                        ("css=label", True),
                                        ("css=button", True)]}),
    ("/subscription_test.html", {"expect":[("css=[data-plan]", True),
                                           ("css=button", True)]}),
    ("/availability_test.html", {"expect":[("css=[data-slot]", True),
                                           ("css=button", True)]}),
    ("/shareable_profile_test.html", {"expect":[("css=#copy_link_btn", True),
                                                ("css=[aria-expanded]", True)]}),
    ("/profiles_test.html", {"expect":[("css=table", True),
                                       ("css=button", True)]}),
    ("/uploads_test.html", {"expect":[("css=input[type=file]", True),
                                      ("css=[role=status]", True)]}),
]

def main(base_url, outdir):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        page = ctx.new_page()
        for path, rules in PAGES:
            page.goto(base_url + path)
            for sel, should_exist in rules["expect"]:
                got = page.locator(sel).count() > 0
                if should_exist and not got:
                    return {"status":"FAIL","page":path,"missing":sel}
        browser.close()
    return {"status":"PASS"}
