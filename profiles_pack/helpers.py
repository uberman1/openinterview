import os, re, json
from PIL import Image, ImageChops

def ensure_dir(p): os.makedirs(p, exist_ok=True)

def diff_images(baseline_bytes, current_bytes):
    import io
    base = Image.open(io.BytesIO(baseline_bytes)).convert('RGBA')
    curr = Image.open(io.BytesIO(current_bytes)).convert('RGBA')
    if base.size != curr.size:
        curr = curr.resize(base.size)
    diff = ImageChops.difference(base, curr)
    bbox = diff.getbbox()
    if not bbox:
        return 0.0, None
    nonzero = diff.convert('L').point(lambda p: 255 if p else 0)
    ratio = float(nonzero.histogram()[255]) / (base.size[0]*base.size[1])
    return ratio, diff

def append_row_to_test_index(version, description, page_url, code_path, test_path):
    target = "public/test2.html"
    if not os.path.exists(target): return False
    with open(target, "r", encoding="utf-8") as f: html = f.read()
    pattern = r'(<section[^>]*id=["\']profiles["\'][\s\S]*?<tbody[^>]*>)([\s\S]*?)(</tbody>)'
    m = re.search(pattern, html, flags=re.IGNORECASE)
    if not m: return False
    row = f'<tr><td class="mono">{version}</td><td>{description}</td><td><a href="{page_url}" target="_blank">open</a></td><td><a href="{code_path}" target="_blank">source.txt</a></td><td><a href="{test_path}" target="_blank">tests.txt</a></td></tr>'
    new_html = html[:m.end(1)] + row + html[m.end(1):]
    with open(target, "w", encoding="utf-8") as f: f.write(new_html)
    return True

def prereq_subscription_active():
    state_path = os.path.join("qa","_state","session.json")
    if not os.path.exists(state_path): return False
    try:
        with open(state_path,"r",encoding="utf-8") as f: state = json.load(f)
        return state.get("subscription",{}).get("status") == "active"
    except Exception:
        return False
