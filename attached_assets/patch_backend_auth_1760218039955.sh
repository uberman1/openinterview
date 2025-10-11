#!/usr/bin/env bash
set -euo pipefail
MAIN="backend/main.py"
NEED="from backend.addons.auth_ext import router as auth_ext_router"
INCLUDE="app.include_router(auth_ext_router)"
mkdir -p backend/addons
if ! grep -q "backend.addons.auth_ext" "$MAIN"; then
  awk -v n="$NEED" 'NR==1,1{print} /from fastapi import FastAPI/{print n} NR>1' "$MAIN" > "$MAIN.tmp"
  mv "$MAIN.tmp" "$MAIN"
fi
if ! grep -q "auth_ext_router" "$MAIN"; then
  awk -v inc="$INCLUDE" '
    /app = FastAPI/ && !x {print; print inc; x=1; next}1
  ' "$MAIN" > "$MAIN.tmp"
  mv "$MAIN.tmp" "$MAIN"
fi
echo "[patch_backend_auth] Done."
