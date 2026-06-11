import os, re, json

def ensure_dir(p): os.makedirs(p, exist_ok=True)

def append_row_to_test_index(version, description, page_url, code_path, test_path):
    target = "test2.html"
    if not os.path.exists(target): return False
    with open(target, "r", encoding="utf-8") as f: html = f.read()
    pattern = r'(<section[^>]*id=["\']Profiles["\'][\s\S]*?<tbody[^>]*>)([\s\S]*?)(</tbody>)'
    m = re.search(pattern, html, flags=re.IGNORECASE)
    if not m: return False
    row = f'<tr><td>{version}</td><td>{description}</td><td><a href="{page_url}">page</a></td><td><a href="{code_path}">code</a></td><td><a href="{test_path}">tests</a></td></tr>'
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
