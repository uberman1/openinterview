#!/usr/bin/env python3
import sys, re, datetime, pathlib, json
from bs4 import BeautifulSoup

HTML = pathlib.Path("public/test2.html")
if not HTML.exists():
    print("test2.html not found at public/test2.html", file=sys.stderr); sys.exit(1)

soup = BeautifulSoup(HTML.read_text(encoding="utf-8"), "html.parser")
section_id = "stage4"
hdr = soup.find(id=section_id)
if not hdr:
    hdr = soup.new_tag("h2", id=section_id)
    hdr.string = "Stage 4 — Production Go-Live"
    (soup.body or soup).append(hdr)
    tbl = soup.new_tag("table", **{"data-pack":"stage4"})
    thead = soup.new_tag("thead")
    for col in ["version","description","link","code","test"]:
        th = soup.new_tag("th"); th.string = col; thead.append(th)
    tbl.append(thead); tbody = soup.new_tag("tbody"); tbl.append(tbody)
    (soup.body or soup).append(tbl)

tbl = soup.find("table", attrs={"data-pack":"stage4"})
tbody = tbl.find("tbody")
version = "v0.4.0"
# dedupe
for tr in list(tbody.find_all("tr")):
    tds = tr.find_all("td")
    if tds and tds[0].get_text(strip=True) == version:
        tr.decompose()

tr = soup.new_tag("tr")
def td_link(text, href):
    td = soup.new_tag("td")
    a = soup.new_tag("a", href=href); a.string = text
    td.append(a); return td

td0 = soup.new_tag("td"); td0.string = version; tr.append(td0)
td1 = soup.new_tag("td"); td1.string = "Stage 4 readiness gate: health, canary latency, CSP header, provider config checks; artifacts saved."; tr.append(td1)
tr.append(td_link("Home", "/"))
tr.append(td_link("stage4/run_stage4.py", "/stage4/run_stage4.py"))
tr.append(td_link("summary.json", "/qa/stage4/v0.4.0/summary.json"))
tbody.append(tr)

HTML.write_text(str(soup), encoding="utf-8")
print("Updated test2.html with Stage 4 row")
