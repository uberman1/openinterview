import os, re, json
from PIL import Image, ImageChops

def ensure_dir(p):
    os.makedirs(p, exist_ok=True)

def diff_images(baseline_bytes, current_bytes):
    try:
        base = Image.open(io.BytesIO(baseline_bytes)).convert('RGBA')
    except Exception:
        import io as _io
        base = Image.open(_io.BytesIO(baseline_bytes)).convert('RGBA')
    import io
    curr = Image.open(io.BytesIO(current_bytes)).convert('RGBA')
    if base.size != curr.size:
        curr = curr.resize(base.size)
    diff = ImageChops.difference(base, curr)
    bbox = diff.getbbox()
    if not bbox:
        return 0.0, None
    # crude ratio by counting non-transparent pixels
    nonzero = diff.convert('L').point(lambda p: 255 if p else 0)
    total = base.size[0]*base.size[1]*255
    ratio = float(nonzero.histogram()[255]) / (base.size[0]*base.size[1])
    return ratio, diff

def append_row_to_test_index(version, description, page_url, code_path, test_path):
    # minimal, robust appender: insert a row under <section id="subscription">
    target = "public/test2.html"
    if not os.path.exists(target):
        return False
    with open(target, "r", encoding="utf-8") as f:
        html = f.read()
    import re
    pattern = r'(<section[^>]*id=["\']subscription["\'][\s\S]*?<tbody[^>]*>)([\s\S]*?)(</tbody>)'
    m = re.search(pattern, html, flags=re.IGNORECASE)
    if not m:
        return False
    row = f'<tr><td class="mono">{version}</td><td>{description}</td><td><a href="{page_url}" target="_blank">open</a></td><td><a href="{code_path}" target="_blank">source.txt</a></td><td><a href="{test_path}" target="_blank">tests.txt</a></td></tr>'
    new_html = html[:m.end(1)] + row + html[m.end(1):]
    with open(target, "w", encoding="utf-8") as f:
        f.write(new_html)
    return True
