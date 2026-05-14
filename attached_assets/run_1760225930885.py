from playwright.sync_api import sync_playwright
import json, time

def run():
    res = {}
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"], headless=True)
        page = b.new_page()
        # CSRF
        r = page.request.get("http://localhost:8000/api/security/csrf")
        csrf = r.json().get("csrf")
        res["csrf"] = "PASS" if isinstance(csrf, str) and "." in csrf else "FAIL"
        # Rate limit (5 allowed, 6th 429)
        ok = True
        for i in range(6):
            rr = page.request.get("http://localhost:8000/api/security/rate_check")
            if i < 5 and rr.ok is False: ok = False
            if i == 5 and rr.status != 429: ok = False
        res["rate_limit"] = "PASS" if ok else "FAIL"
        # Session touch (not expired within run)
        rr = page.request.post("http://localhost:8000/api/security/touch")
        res["session_touch"] = "PASS" if rr.ok else "FAIL"
        b.close()
    return res

if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
