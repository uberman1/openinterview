
import re, pathlib

SECTION_TITLE = "Stage 3 — Staging Pilot"
TEMPLATE_ROW = '<tr><td>{version}</td><td>{desc}</td><td><a href="{link}">link</a></td><td><a href="{code}">code</a></td><td><a href="{test}">tests</a></td></tr>'

def update_test_index(version, description, link, code_link, test_link, path="public/test2.html"):
    p = pathlib.Path(path)
    html = p.read_text(encoding="utf-8")
    if SECTION_TITLE not in html:
        section = f'''
<section id="stage3">
  <h2>{SECTION_TITLE}</h2>
  <table>
    <thead><tr><th>version</th><th>description</th><th>link</th><th>code</th><th>test</th></tr></thead>
    <tbody>
    </tbody>
  </table>
</section>
'''
        html = html.replace("</body>", section + "\n</body>")
    row = TEMPLATE_ROW.format(version=version, desc=description, link=link, code=code_link, test=test_link)
    html = re.sub(r'(</tbody>)', row + r"\1", html, count=1)
    p.write_text(html, encoding="utf-8")
    print("[stage3] test2.html updated with", version)

if __name__ == "__main__":
    update_test_index("v0.3.0", "Stage 3 Staging Pilot – API health + Release Gate (API-mode)",
                      "/", "/qa/stage3/v0.3.0/smoke_results.json", "/qa/stage3/v0.3.0/summary.json")
