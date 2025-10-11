#!/usr/bin/env bash
set -euo pipefail
MAIN="backend/main.py"
if ! grep -q "CORSMiddleware" "$MAIN"; then
  perl -0777 -pe "s|(app = FastAPI\(.*?\))|$1\nfrom fastapi.middleware.cors import CORSMiddleware\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=['http://localhost:8000','http://127.0.0.1:8000'],\n    allow_credentials=True,\n    allow_methods=['*'],\n    allow_headers=['*'],\n)\n|s" -i "$MAIN"
fi
echo "[patch_backend_cors] Done."
