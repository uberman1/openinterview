#!/usr/bin/env python3
import pathlib

main_py = pathlib.Path("backend/main.py")
if not main_py.exists():
    print("backend/main.py not found; skipping.")
    raise SystemExit(0)
text = main_py.read_text(encoding="utf-8")

changed = False
if "from addons.org_ext import router as org_router" not in text:
    insert = "\nfrom addons.org_ext import router as org_router\nfrom addons.audit_ext import router as audit_router\nfrom addons.metrics_ext import router as metrics_router"
    text = text.replace("from fastapi import FastAPI", "from fastapi import FastAPI" + insert)
    changed = True

includes = "app.include_router(org_router)"
if includes not in text:
    text += "\napp.include_router(org_router)\napp.include_router(audit_router)\napp.include_router(metrics_router)\n"
    changed = True

if changed:
    main_py.write_text(text, encoding="utf-8")
    print("Patched backend/main.py with Bundle C routers.")
else:
    print("Bundle C routers already present; no changes.")
