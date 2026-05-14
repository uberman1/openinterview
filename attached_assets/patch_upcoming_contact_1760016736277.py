#!/usr/bin/env python3
import argparse, os, re, sys, json
from datetime import datetime

HEADER_RE = re.compile(r"(<th[^>]*>\s*)Actions(\s*</th>)", re.IGNORECASE)
VIEW_DETAILS_RE = re.compile(r"<a\b([^>]*?)>(\s*View\s*Details\s*)</a>", re.IGNORECASE|re.DOTALL)
UPCOMING_HINTS = [re.compile(r"Upcoming\s*Interviews", re.IGNORECASE),
                  re.compile(r"id=['\"]upcoming[-_ ]?interviews['\"]", re.IGNORECASE),
                  re.compile(r"class=['\"][^'\"]*upcoming[^'\"]*interviews[^'\"]*['\"]", re.IGNORECASE)]
JS_VIEW_DETAILS_PATTERNS = [re.compile(r"innerHTML\s*=\s*`[^`]*View\s*Details[^`]*`", re.IGNORECASE|re.DOTALL),
                            re.compile(r"innerHTML\s*=\s*['\"][^\"']*View\s*Details[^\"']*['\"]", re.IGNORECASE|re.DOTALL)]

def ts(): return datetime.now().strftime("%Y%m%d_%H%M%S")

def backup(path):
    b = f"{path}.{ts()}.bak"
    with open(path, "rb") as fsrc, open(b, "wb") as fdst:
        fdst.write(fsrc.read())
    return b

def load_map(repo_root):
    p = os.path.join(repo_root, "recruiter_emails.json")
    if os.path.exists(p):
        try:
            import json
            with open(p, "r", encoding="utf-8") as f: d = json.load(f)
            return d.get("interviewId_to_email", {})
        except Exception as e:
            print("[warn] recruiter_emails.json parse failed:", e)
    return {}

def patch_home_html(path, id_to_email):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()
    if not any(p.search(html) for p in UPCOMING_HINTS):
        return False, 0
    original = html

    html, n1 = HEADER_RE.subn(r"\1Contact\2", html)

    def repl(m):
        return '<span class="text-sm text-gray-800 break-all recruiter-email"></span>'
    html, n2 = VIEW_DETAILS_RE.subn(repl, html)

    if html != original:
        backup(path)
        with open(path, "w", encoding="utf-8") as f: f.write(html)
        return True, n1+n2
    return False, 0

def patch_js_file(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        code = f.read()
    original = code
    code = re.sub(r"(textContent\s*=\s*['\"])Actions(['\"]\s*;)", r"\1Contact\2", code, flags=re.IGNORECASE)
    for pat in JS_VIEW_DETAILS_PATTERNS:
        code = pat.sub("textContent = (iv and (iv.get('recruiterEmail') if hasattr(iv,'get') else getattr(iv,'recruiterEmail', None))) or (item and (item.get('recruiterEmail') if hasattr(item,'get') else getattr(item,'recruiterEmail', None))) or '';", code)
    code = re.sub(r"[`'\"]<a[^>]*>\s*View\s*Details\s*</a>[`'\"]",
                  "'<span class=\"text-sm text-gray-800 break-all recruiter-email\"></span>'",
                  code, flags=re.IGNORECASE|re.DOTALL)
    if code != original:
        backup(path)
        with open(path, "w", encoding="utf-8") as f: f.write(code)
        return True
    return False

def walk_and_patch(repo_root):
    id_to_email = load_map(repo_root)
    total, changed_files = 0, []
    for dirpath, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [d for d in dirnames if d not in {'node_modules','dist','build','.next','.vercel','.git'}]
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            lower = fn.lower()
            if lower == "home.html":
                ch, n = patch_home_html(fp, id_to_email)
                if ch: changed_files.append(fp); total += n
            elif lower.endswith((".js",".ts",".jsx",".tsx")):
                if patch_js_file(fp): changed_files.append(fp); total += 1
    return changed_files, total

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=".", help="Repository root (default: .)")
    args = ap.parse_args()
    repo = os.path.abspath(args.repo)
    if not os.path.isdir(repo):
        print("[error] repo not found:", repo); sys.exit(1)
    files, total = walk_and_patch(repo)
    if files:
        print("[ok] Patched files:"); [print(" -", os.path.relpath(p, repo)) for p in files]
        print("[ok] Total substitutions:", total); sys.exit(0)
    else:
        print("[note] No target patterns found."); sys.exit(0)

if __name__ == "__main__":
    main()
