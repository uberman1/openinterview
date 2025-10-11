import os, re

def ensure_dir(p): os.makedirs(p, exist_ok=True)

def update_test_index(section_id, version, description, page_url, code_path, test_path):
    candidates = ["test2.html", os.path.join("public","test2.html")]
    for index_file in candidates:
        if not os.path.exists(index_file): 
            continue
        with open(index_file, "r", encoding="utf-8") as f: html = f.read()
        pattern = rf'(<section[^>]*id=["\']{re.escape(section_id)}["\'][\s\S]*?<tbody[^>]*>)([\s\S]*?)(</tbody>)'
        m = re.search(pattern, html, flags=re.IGNORECASE)
        if not m: 
            continue
        row = f'<tr><td>{version}</td><td>{description}</td><td><a href="{page_url}">page</a></td><td><a href="{code_path}">code</a></td><td><a href="{test_path}">tests</a></td></tr>'
        new_html = html[:m.end(1)] + row + html[m.end(1):]
        with open(index_file, "w", encoding="utf-8") as f: f.write(new_html)
        return True
    return False
