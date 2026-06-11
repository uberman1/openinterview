#!/usr/bin/env python3
"""deploy_binder.py
Copy binders/home-links.js into a suitable static/binder folder in your repo without modifying protected HTML files.
Usage: python3 scripts/deploy_binder.py [--repo /path/to/repo]
"""
import os, shutil, argparse, sys, textwrap

COMMON_TARGETS = [
    'public/binders', 'public/js/binders', 'static/binders', 'assets/binders', 'binders', 'public/assets/binders'
]

def find_repo_root(start):
    cur = os.path.abspath(start)
    max_up = 5
    while max_up>0:
        if os.path.isdir(os.path.join(cur, '.git')):
            return cur
        parent = os.path.dirname(cur)
        if parent==cur: break
        cur = parent
        max_up -= 1
    return os.path.abspath(start)

def select_target(repo_root):
    for t in COMMON_TARGETS:
        full = os.path.join(repo_root, t)
        if os.path.isdir(full):
            return full
    return os.path.join(repo_root, COMMON_TARGETS[0])

def install(src, dest):
    os.makedirs(dest, exist_ok=True)
    dst = os.path.join(dest, 'home-links.js')
    shutil.copy2(src, dst)
    print(f'[ok] Installed binder script to: {dst}')
    return dst

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default='.', help='Repository root (default: current dir)')
    args = ap.parse_args()
    repo = find_repo_root(args.repo)
    target = select_target(repo)
    print('[info] Repo root:', repo)
    print('[info] Chosen target folder:', target)
    src = os.path.join(os.path.dirname(__file__), '..', 'binders', 'home-links.js')
    if not os.path.exists(src):
        print('[error] Source binder script not found at', src); sys.exit(2)
    dst = install(src, target)
    print(textwrap.dedent(f"""

Next steps (no protected HTML modified):
1) Add this script to your page templates or loader so it's included at runtime.
   Example (in your base template or head/footer partial):
   <script src="/binders/home-links.js"></script>

2) If your app serves static files from a different base path, adjust the URL accordingly.
3) If you use a central 'binder' loader, register the script there instead of editing protected files.

If you want, run this script in the repo to install the binder file automatically. It will NOT modify home.html or other protected files.
"""))

if __name__ == '__main__':
    main()
