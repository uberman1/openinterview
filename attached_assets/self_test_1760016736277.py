#!/usr/bin/env python3
import argparse, os, re, sys

def scan(repo_root):
    problems = []
    for dirpath, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [d for d in dirnames if d not in {'node_modules','dist','build','.next','.vercel','.git'}]
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            lower = fn.lower()
            try:
                with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                    txt = f.read()
            except Exception:
                continue
            if lower == "home.html" or lower.endswith((".js",".ts",".jsx",".tsx")):
                if re.search(r"Upcoming\s*Interviews", txt, re.IGNORECASE):
                    if re.search(r"<th[^>]*>\s*Actions\s*</th>", txt, re.IGNORECASE):
                        problems.append(f"{fp}: still has <th>Actions</th> under Upcoming Interviews")
                if re.search(r">\s*View\s*Details\s*<", txt, re.IGNORECASE):
                    problems.append(f"{fp}: still contains a 'View Details' anchor")
    return problems

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=".", help="Repository root (default: .)")
    args = ap.parse_args()
    repo = os.path.abspath(args.repo)
    if not os.path.isdir(repo):
        print("[error] repo not found:", repo); sys.exit(2)
    probs = scan(repo)
    if probs:
        print("[FAIL] Issues found:")
        for p in probs: print(" -", p)
        sys.exit(1)
    else:
        print("[PASS] Self-test passed."); sys.exit(0)

if __name__ == "__main__":
    main()
