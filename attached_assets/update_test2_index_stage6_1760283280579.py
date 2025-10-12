# Append a Stage 6 row to public/test2.html under 'Release Gate – Infra' or create section.
from pathlib import Path
import datetime, re

now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
p = Path("public/test2.html")
html = p.read_text(encoding="utf-8") if p.exists() else ""

section_id = "quality-infra"
if section_id not in html:
    # Create minimal section
    html += f"""
<section id="{section_id}">
  <h2>Release Gate – Infra</h2>
  <table>
    <thead><tr><th>version</th><th>description</th><th>link</th><th>code</th><th>test</th></tr></thead>
    <tbody id="infra-body"></tbody>
  </table>
</section>
"""

row = f"""
<tr>
  <td>v0.6.0</td>
  <td>Stage 6 — Provider Sandbox & Shadow-Mode integrated; sandbox & shadow smoke tests; artifacts saved.</td>
  <td><a href="/public/stage6_status.html">status</a></td>
  <td><a href="/README_STAGE6.md">docs</a></td>
  <td><a href="/qa/stage6/v0.6.0/tests.txt">results</a></td>
</tr>
"""

# Try to insert into infra-body
html = re.sub(r'(<tbody id="infra-body">)', r"\1" + row, html, count=1) if 'infra-body' in html else html + row

p.write_text(html, encoding="utf-8")
print(f"Updated test2.html at {now}")
