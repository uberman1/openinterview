import os, json, io
from PIL import Image, ImageChops

def ensure_dir(p):
    os.makedirs(p, exist_ok=True)

def write_txt(path, content):
    ensure_dir(os.path.dirname(path))
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def write_json(path, data):
    ensure_dir(os.path.dirname(path))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def snapshot_source(url_path, src_path, out_path):
    try:
        with open(src_path, "r", encoding="utf-8") as f:
            html = f.read()
        write_txt(out_path, html)
    except Exception as e:
        write_txt(out_path, f"SNAPSHOT_FAILED: {e}")

def diff_images(imgA_bytes, imgB_bytes):
    imgA = Image.open(io.BytesIO(imgA_bytes)).convert("RGB")
    imgB = Image.open(io.BytesIO(imgB_bytes)).convert("RGB")
    if imgA.size != imgB.size:
        return 1.0, None
    diff = ImageChops.difference(imgA, imgB)
    bbox = diff.getbbox()
    if not bbox:
        return 0.0, None
    total = imgA.size[0] * imgA.size[1]
    diff_gray = diff.convert("L")
    nonzero = sum(1 for px in diff_gray.getdata() if px != 0)
    return nonzero / total, diff
