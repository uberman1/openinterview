# Notifications & Email Pack v0.1.0 — Self-Deploy

## Files
- backend/addons/notify_ext.py
- public/notify_test.html
- public/notify.bind.js
- notify_pack/*
- scripts/run_notify_pack.sh
- release_gate/patch_release_gate.sh

## Deploy
unzip -o notify_pack_v0_1_0.zip
# Wire router in backend/main.py:
# from backend.addons.notify_ext import router as notify_router
# app.include_router(notify_router)
bash scripts/serve_api.sh
bash scripts/run_notify_pack.sh
bash release_gate/patch_release_gate.sh
PYTHONPATH=. python release_gate/run_all.py
