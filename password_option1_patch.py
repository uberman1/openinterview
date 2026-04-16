#!/usr/bin/env python3
import re, sys, os

PATH = "public/password.html"

def read(p):
    with open(p, "r", encoding="utf-8") as f:
        return f.read()

def write(p, s):
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)

def ensure_head_csp(html):
    if re.search(r'Content-Security-Policy', html, re.I):
        return html, False
    html2, n = re.subn(r'(<head[^>]*>)', r"\1\n<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'\">", html, count=1, flags=re.I)
    return (html2 if n else html), bool(n)

def ensure_form_id(html):
    if re.search(r'<form\b[^>]*id=[\"\']password-form[\"\']', html, re.I):
        return html, False
    def add_id(m):
        tag = m.group(0)
        if re.search(r'id=', tag, re.I):
            return tag
        return tag[:-1] + ' id="password-form">'
    html2, n = re.subn(r'<form\b[^>]*>', add_id, html, count=1, flags=re.I)
    return (html2 if n else html), bool(n)

def rename_id(html, old_id, new_id, also_name=True):
    n_changes = 0
    html2, n = re.subn(rf'id=[\"\']{re.escape(old_id)}[\"\']', f'id="{new_id}"', html)
    n_changes += n; html = html2
    html2, n = re.subn(rf'for=[\"\']{re.escape(old_id)}[\"\']', f'for="{new_id}"', html)
    n_changes += n; html = html2
    html2, n = re.subn(rf'aria-controls=[\"\']{re.escape(old_id)}[\"\']', f'aria-controls="{new_id}"', html)
    n_changes += n; html = html2
    if also_name:
        html2, n = re.subn(rf'name=[\"\']{re.escape(old_id)}[\"\']', f'name="{new_id}"', html)
        n_changes += n; html = html2
    return html, n_changes>0

def ensure_input_block(html, block_html, anchor_id):
    if re.search(r'id=[\"\']' + re.escape(re.findall(r'id=[\"\']([^"\']+)[\"\']', block_html)[0]) + r'[\"\']', html, re.I):
        return html, False
    anchor = re.search(rf'id=[\"\']{anchor_id}[\"\']', html)
    insert_pos = anchor.start() if anchor else None
    if insert_pos is None:
        m = re.search(r'</form>', html, re.I)
        insert_pos = m.start() if m else len(html)
    return html[:insert_pos] + block_html + html[insert_pos:], True

def ensure_region_after(html, after_id, region_html):
    rid = re.findall(r'id=[\"\']([^"\']+)[\"\']', region_html)[0]
    if re.search(r'id=[\"\']' + re.escape(rid) + r'[\"\']', html, re.I):
        return html, False
    m = re.search(rf'(id=[\"\']{after_id}[\"\'][^>]*>)', html, re.I)
    if not m:
        end = re.search(r'</form>', html, re.I)
        pos = end.start() if end else len(html)
        return html[:pos] + region_html + html[pos:], True
    pos = m.end()
    return html[:pos] + region_html + html[pos:], True

def ensure_submit_id_disabled(html):
    def mutate(m):
        tag = m.group(0)
        if not re.search(r'id=[\"\']submit_btn[\"\']', tag):
            tag = tag[:-1] + ' id="submit_btn">'
        if not re.search(r'\bdisabled\b', tag):
            tag = tag[:-1] + ' disabled>'
        return tag
    html2, n = re.subn(r'<button\b[^>]*type=[\"\']submit[\"\'][^>]*>', mutate, html, count=1, flags=re.I)
    return (html2 if n else html), bool(n)

def ensure_toggle_button(html):
    if re.search(r'id=[\"\']toggle_pw[\"\']', html, re.I):
        return html, False
    toggle = '<button id="toggle_pw" type="button" aria-controls="new_password" aria-pressed="false">Show</button>'
    m = re.search(r'id=[\"\']new_password[\"\'][^>]*>', html, re.I)
    if not m:
        return html, False
    pos = m.end()
    return html[:pos] + toggle + html[pos:], True

def ensure_back_link(html):
    if re.search(r'id=[\"\']back_to_login[\"\']', html, re.I):
        return html, False
    link = '<a id="back_to_login" href="/login.html">Back to login</a>'
    m = re.search(r'</form>', html, re.I)
    if not m:
        return html, False
    pos = m.start()
    return html[:pos] + link + html[pos:], True

def ensure_hidden_csrf(html):
    if re.search(r'name=[\"\']csrf_token[\"\']', html, re.I):
        return html, False
    hidden = '<input type="hidden" name="csrf_token" value="__CSRF__">'
    m = re.search(r'<form\b[^>]*>', html, re.I)
    if not m: return html, False
    pos = m.end()
    return html[:pos] + hidden + html[pos:], True

def ensure_aria_describedby(html):
    pattern = r'(<input\b[^>]*id=[\"\']new_password[\"\'][^>]*)(>)'
    def add_desc(m):
        tag = m.group(1)
        if re.search(r'aria-describedby=', tag, re.I): return m.group(0)
        return tag + ' aria-describedby="pw_rules pw_strength"' + m.group(2)
    html2, n = re.subn(pattern, add_desc, html, count=1, flags=re.I)
    return (html2 if n else html), bool(n)

def main():
    if not os.path.exists(PATH):
        print("ERROR: public/password.html not found")
        sys.exit(1)
    src = read(PATH)
    backup = PATH + ".bak"
    if not os.path.exists(backup):
        with open(backup, "w", encoding="utf-8") as f: f.write(src)

    html = src
    changes = []

    html, c = ensure_head_csp(html);                changes.append(("CSP meta", c))
    html, c = ensure_form_id(html);                 changes.append(("form#password-form", c))
    html, c = rename_id(html, "new-password", "new_password"); changes.append(("rename new-password→new_password", c))
    html, c = rename_id(html, "confirm-new-password", "confirm_password"); changes.append(("rename confirm-new-password→confirm_password", c))

    email_block = '\n<label for="email">Email</label>\n<input id="email" type="email" name="email" autocomplete="email" required aria-required="true">'
    token_block = '\n<label for="token">Reset Token</label>\n<input id="token" type="text" name="token" inputmode="numeric" required aria-required="true">'
    html, c = ensure_input_block(html, email_block, "new_password"); changes.append(("email block", c))
    html, c = ensure_input_block(html, token_block, "new_password"); changes.append(("token block", c))

    html, c = ensure_region_after(html, "new_password", '<div id="pw_strength" role="status" aria-live="polite">Strength: -</div>'); changes.append(("pw_strength", c))
    html, c = ensure_region_after(html, "new_password", '<p id="pw_rules">Use 8+ chars, upper/lowercase, number, symbol.</p>'); changes.append(("pw_rules", c))
    html, c = ensure_region_after(html, "new_password", '<div id="errors" role="alert" aria-live="assertive"></div>'); changes.append(("errors live region", c))

    html, c = ensure_submit_id_disabled(html);      changes.append(("submit id+disabled", c))
    html, c = ensure_toggle_button(html);           changes.append(("toggle_pw button", c))
    html, c = ensure_back_link(html);               changes.append(("back_to_login link", c))
    html, c = ensure_hidden_csrf(html);             changes.append(("hidden csrf_token", c))
    html, c = ensure_aria_describedby(html);       changes.append(("aria-describedby on new_password", c))

    write(PATH, html)

    print("Patched:", PATH)
    for k, v in changes:
        print(f"- {k}: {'added/updated' if v else 'ok'}")

if __name__ == "__main__":
    main()
