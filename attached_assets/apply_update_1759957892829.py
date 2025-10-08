#!/usr/bin/env python3
import sys, re, os, io, json

MARKER_CSS_START = "/* OI-UI-Scroll-Hero-v1:START */"
MARKER_CSS_END   = "/* OI-UI-Scroll-Hero-v1:END */"
MARKER_JS_START  = "<!-- OI-UI-Scroll-Hero-v1:START -->"
MARKER_JS_END    = "<!-- OI-UI-Scroll-Hero-v1:END -->"

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

def get_snippet(relpath):
    base = os.path.dirname(os.path.dirname(__file__))
    with open(os.path.join(base, relpath), "r", encoding="utf-8") as f:
        return f.read()

def ensure_hero_ids(html):
    # Add id="heroWrapper" + sticky classes to hero wrapper
    pattern = r'<div([^>]*?)class="([^"]*?\brelative\b[^"]*?\baspect-video\b[^"]*?\bw-full\b[^"]*?)"([^>]*)>'
    def repl(m):
        pre_attrs, classes, post_attrs = m.group(1), m.group(2), m.group(3)
        if 'id="heroWrapper"' not in m.group(0):
            pre_attrs = pre_attrs + ' id="heroWrapper"'
        for c in ["lg:sticky", "lg:top-0", "lg:z-10"]:
            if c not in classes:
                classes += " " + c
        if 'style=' not in m.group(0) or '--hero-h' not in m.group(0):
            post_attrs = post_attrs + ' style="--hero-h:auto; --hero-scale:1;"'
        return f'<div{pre_attrs} class="{classes}"{post_attrs}>'
    html2, n = re.subn(pattern, repl, html, count=1, flags=re.DOTALL)
    if n == 0:
        html2 = html
    # Add id="heroInner" to overlay
    overlay_pat = r'<div([^>]*?)class="([^"]*?\babsolute\b[^"]*?\binset-0\b[^"]*?\bbg-black/30\b[^"]*?)"([^>]*)>'
    def repl_overlay(m):
        pre_attrs, classes, post_attrs = m.group(1), m.group(2), m.group(3)
        if 'id="heroInner"' not in m.group(0):
            pre_attrs = pre_attrs + ' id="heroInner"'
        return f'<div{pre_attrs} class="{classes}"{post_attrs}>'
    html2 = re.sub(overlay_pat, repl_overlay, html2, count=1, flags=re.DOTALL)
    return html2

def insert_below_resume_scroller(html):
    # Find the Resume section by locating <h2 ...>Resume</h2> then the closing </section> after it
    h2_match = re.search(r'<h2[^>]*>\s*Resume\s*</h2>', html, flags=re.IGNORECASE)
    if not h2_match:
        return html
    sec_close = re.search(r'</section\s*>', html[h2_match.end():], flags=re.IGNORECASE)
    if not sec_close:
        return html
    insert_pos = h2_match.end() + sec_close.end()
    if 'id="below-resume-scroll"' in html:
        return html
    SCROLL_CONTAINER = (
        '<div id="below-resume-scroll" '
        'class="space-y-6 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2">'
        '<!-- OI-UI-Scroll-Hero-v1: below-resume content goes here -->'
        '</div>\n'
    )
    return html[:insert_pos] + "\n\n" + SCROLL_CONTAINER + "\n" + html[insert_pos:]

def inject_css(html):
    if MARKER_CSS_START in html:
        return html
    css = get_snippet(os.path.join("snippets","css.txt"))
    # Try to inject into first <style>...</style>
    m = re.search(r'<style[^>]*>', html, flags=re.IGNORECASE)
    if m:
        insert_pos = m.end()
        return html[:insert_pos] + "\n" + css + "\n" + html[insert_pos:]
    # else inject a new style block before </head>
    m2 = re.search(r'</head\s*>', html, flags=re.IGNORECASE)
    if m2:
        style_tag = "<style>\n" + css + "\n</style>\n"
        return html[:m2.start()] + style_tag + html[m2.start():]
    return html

def inject_js(html):
    if MARKER_JS_START in html:
        return html
    js = get_snippet(os.path.join("snippets","js.txt"))
    m = re.search(r'</body\s*>', html, flags=re.IGNORECASE)
    if not m:
        return html
    return html[:m.start()] + "\n" + js + "\n" + html[m.start():]

def main():
    if len(sys.argv) < 2:
        print("Usage: apply_update.py /absolute/path/to/profile.html")
        sys.exit(1)
    path = sys.argv[1]
    html = read(path)

    original = html
    html = ensure_hero_ids(html)
    html = insert_below_resume_scroller(html)
    html = inject_css(html)
    html = inject_js(html)

    if html != original:
        write(path, html)
        print("OK: OI-UI-Scroll-Hero-v1 applied.")
    else:
        print("No changes applied (already patched or patterns not found).")

if __name__ == "__main__":
    main()
