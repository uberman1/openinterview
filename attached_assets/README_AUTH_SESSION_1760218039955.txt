
Auth & Session Pack v0.1.0

What this adds
- Backend router for passwordless auth (signup, verify, logout, session, csrf)
- Public QA page + binder (no protected files touched)
- Playwright tests (contract, behavior, a11y, security, visual)
- Runner that writes qa/auth/v0.1.0 artifacts and updates public/test2.html

How to deploy in Replit
1) Patch backend to include router:
   bash scripts/patch_backend_auth.sh
2) Start your API:
   bash scripts/serve_api.sh
3) Install test deps:
   pip install -r auth_pack/requirements.txt
   python -m playwright install chromium
4) Run tests (and update test2.html):
   PYTHONPATH=. python auth_pack/run.py

Flags
- INVITE_REQUIRED=1 and INVITE_CODE=ALPHA2025 (defaults). Change as needed.
- Frontend calls http://127.0.0.1:8000 by default; tests set qa_health_url automatically.
