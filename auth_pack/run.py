
import pathlib, re, json
from auth_pack.tests import run_all

VERSION = "v0.1.1"
SECTION = "auth"
PAGE_URL = "/public/auth_test.html"

def update_test_index():
    index_path = pathlib.Path("public/test2.html")
    if not index_path.exists():
        index_path.parent.mkdir(parents=True, exist_ok=True)
        index_path.write_text(f"<!doctype html><html><body><h1>QA Index</h1><section id='{SECTION}'><h2>Auth</h2><table border='1'><thead><tr><th>version</th><th>description</th><th>link</th><th>code</th><th>test</th></tr></thead><tbody></tbody></table></section></body></html>")
    html = index_path.read_text()
    if f"id='{SECTION}'" not in html and f'id="{SECTION}"' not in html:
        html = html.replace("</body>", f"<section id='{SECTION}'><h2>Auth</h2><table border='1'><thead><tr><th>version</th><th>description</th><th>link</th><th>code</th><th>test</th></tr></thead><tbody></tbody></table></section></body>")
    row = f"<tr><td>{VERSION}</td><td>Auth & Session Pack v{VERSION} – passwordless OTP, sessions, CSRF, invite-only alpha.</td><td><a href='{PAGE_URL}'>page</a></td><td><a href='/qa/auth/{VERSION}/tests.json'>code</a></td><td><a href='/qa/auth/{VERSION}/tests.txt'>test</a></td></tr>"
    html = re.sub(rf"(<section[^>]+id=[\"\']{SECTION}[\"\'][\s\S]*?<tbody>)([\s\S]*?)(</tbody>)", lambda m: m.group(1) + (m.group(2) or "") + row + m.group(3), html, flags=re.IGNORECASE)
    index_path.write_text(html)

def main():
    run_all()
    update_test_index()
    print(json.dumps({"status":"OK","version":VERSION}))

if __name__ == "__main__":
    main()
