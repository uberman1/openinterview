#!/usr/bin/env python3
"""Helper to wire Stage 6 routers into backend/main.py if not already present."""
import pathlib, sys

MAIN_PY = pathlib.Path("backend/main.py")

def main():
    if not MAIN_PY.exists():
        print("backend/main.py not found; skipping patch")
        return 0
    
    src = MAIN_PY.read_text(encoding="utf-8")
    
    # Check if already imported
    if "stripe_live_ext" in src and "notify_live_ext" in src:
        print("Stage 6 routers already imported")
        return 0
    
    # Add imports and router includes
    imports = """
# Stage 6 provider extensions
from backend.addons.stripe_live_ext import router as stripe_live_router
from backend.addons.notify_live_ext import router as notify_live_router
"""
    
    routers = """
# Stage 6 routers
app.include_router(stripe_live_router)
app.include_router(notify_live_router)
"""
    
    # Insert imports after existing imports (look for last import line)
    lines = src.split("\n")
    import_end = 0
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith("from "):
            import_end = i + 1
    
    lines.insert(import_end, imports)
    
    # Insert router includes after app creation (look for app = FastAPI)
    app_line = 0
    for i, line in enumerate(lines):
        if "app = FastAPI" in line or "app=FastAPI" in line:
            app_line = i + 1
            break
    
    if app_line > 0:
        lines.insert(app_line, routers)
    
    MAIN_PY.write_text("\n".join(lines), encoding="utf-8")
    print("Stage 6 routers patched into backend/main.py")
    return 0

if __name__ == "__main__":
    sys.exit(main())
