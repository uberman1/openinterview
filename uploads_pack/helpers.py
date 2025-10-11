import os, re, json

def ensure_dir(p): 
    os.makedirs(p, exist_ok=True)

def update_test_index(section_id, version, description, page_url, code_path, test_path):
    # Try public/test2.html (correct path for this project)
    index_file = os.path.join("public", "test2.html")
    if not os.path.exists(index_file): 
        return False
    
    with open(index_file, "r", encoding="utf-8") as f: 
        html = f.read()
    
    pattern = rf'(<section[^>]*id=["\']{re.escape(section_id)}["\'][\s\S]*?<tbody[^>]*>)([\s\S]*?)(</tbody>)'
    m = re.search(pattern, html, flags=re.IGNORECASE)
    if not m: 
        return False
    
    row = f'<tr><td class="mono">{version}</td><td>{description}</td><td><a href="{page_url}" target="_blank">open</a></td><td><a href="{code_path}" target="_blank">source.txt</a></td><td><a href="{test_path}" target="_blank">tests.txt</a></td></tr>'
    new_html = html[:m.end(1)] + row + html[m.end(1):]
    
    with open(index_file, "w", encoding="utf-8") as f: 
        f.write(new_html)
    
    return True
