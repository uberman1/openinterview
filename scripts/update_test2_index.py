#!/usr/bin/env python3
import sys, re, pathlib, datetime

TEST2 = pathlib.Path("public/test2.html")
if not TEST2.exists():
    TEST2 = pathlib.Path("test2.html")
if not TEST2.exists():
    print("ERROR: test2.html not found in public/ or project root.", file=sys.stderr)
    sys.exit(1)

html = TEST2.read_text(encoding="utf-8")
section_id = "release-gate-infra"
section_header = "Release Gate – Infra"
table_tpl = f"""
<section id="{section_id}">
  <h2>{section_header}</h2>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead>
      <tr>
        <th>version</th>
        <th>description</th>
        <th>link</th>
        <th>code</th>
        <th>test</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
</section>
"""
if f'id="{section_id}"' not in html:
    new_html = re.sub(r"</body>\s*</html>\s*$", table_tpl + "\n</body></html>", html, flags=re.I)
    if new_html == html:
        new_html = html + "\n" + table_tpl
    html = new_html

ts = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
row = f"""
<tr data-version="v0.2.0" data-ts="{ts}">
  <td>v0.2.0</td>
  <td>Bundle A (Security, Stripe webhook, Notifications); requests-based tests wired into Release Gate.</td>
  <td><a href="backend/README.md">backend docs</a></td>
  <td><a href="bundle_a/run_bundle_a_tests.py">bundle tests</a></td>
  <td><a href="qa/bundle_a/v0.2.0/tests.json">results</a></td>
</tr>
"""
pattern = re.compile(rf'(<section id="{section_id}".*?<tbody>)(.*?)(</tbody>)', flags=re.S)
m = pattern.search(html)
if not m:
    html += table_tpl
    m = pattern.search(html)
tbody = m.group(2)
if 'data-version="v0.2.0"' not in tbody:
    tbody = tbody + row
    html = html[:m.start(2)] + tbody + html[m.end(2):]
TEST2.write_text(html, encoding="utf-8")
print("Updated test2.html with Release Gate – Infra v0.2.0 row.")
