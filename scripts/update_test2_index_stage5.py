#!/usr/bin/env python3
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
TEST2 = ROOT / "public" / "test2.html"

def ensure_section(html, section_id, title):
    if section_id in html:
        return html
    insert_at = html.lower().rfind("</body>")
    if insert_at == -1:
        insert_at = len(html)
    block = f"""
<section id="{section_id}" class="qa-section">
  <h2>{title}</h2>
  <table>
    <thead><tr><th>version</th><th>description</th><th>link</th><th>code</th><th>test</th></tr></thead>
    <tbody></tbody>
  </table>
</section>
"""
    return html[:insert_at] + block + html[insert_at:]

def add_row(html, section_id, version, desc, links):
    pattern = rf'(<section[^>]+id["\']={section_id}["\'][\s\S]*?<tbody>)'
    m = re.search(pattern, html, re.IGNORECASE)
    if not m: return html
    row = f'<tr><td>{version}</td><td>{desc}</td><td><a href="{links.get("page","#")}">page</a></td><td><a href="{links.get("code","#")}">code</a></td><td><a href="{links.get("test","#")}">tests</a></td></tr>'
    insert_at = m.end(1)
    return html[:insert_at] + row + html[insert_at:]

def main():
    if not TEST2.exists():
        print("public/test2.html not found; skipping index update"); return
    html = TEST2.read_text(encoding="utf-8")
    html = ensure_section(html, "stage5-uat", "UAT – Stage 5")
    links = {
        "page": "/uat_hub.html",
        "code": "/stage5/run_stage5.py",
        "test": "/qa/stage5/v0.5.0/tests.txt"
    }
    html = add_row(html, "stage5-uat", "v0.5.0", "Pilot & UAT readiness, feedback capture, health checks", links)
    TEST2.write_text(html, encoding="utf-8")
    print("test2.html updated with Stage 5 row.")

if __name__ == "__main__":
    main()
