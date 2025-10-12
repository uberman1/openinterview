#!/usr/bin/env python3
# Append a Stage 7 row to public/test2.html under 'Release Gate – UAT' or create section.
from pathlib import Path
import datetime, re

now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
p = Path("public/test2.html")
html = p.read_text(encoding="utf-8") if p.exists() else ""

section_id = "quality-uat"
if section_id not in html:
    # Create minimal section
    html += f"""
<section id="{section_id}">
  <h2>Release Gate – UAT</h2>
  <table>
    <thead><tr><th>version</th><th>description</th><th>link</th><th>code</th><th>test</th></tr></thead>
    <tbody id="uat-body"></tbody>
  </table>
</section>
"""

row = f"""
<tr>
  <td>v0.7.0</td>
  <td>Stage 7 — UAT Launch Pack integrated; critical flows + governance smoke tests; artifacts saved.</td>
  <td><a href="/stage7_status.html">status</a></td>
  <td><a href="/README_STAGE7.md">docs</a></td>
  <td><a href="/qa/stage7/v0.7.0/tests.txt">results</a></td>
</tr>
"""

# Try to insert into uat-body
html = re.sub(r'(<tbody id="uat-body">)', r"\1" + row, html, count=1) if 'uat-body' in html else html + row

p.write_text(html, encoding="utf-8")
print(f"Updated test2.html at {now}")
