# Bundle A v0.2.0 — Go-live Foundations (Self-Deploy)

## Steps
1) Upload & unzip:
   unzip -o bundle_a_v0_2_0.zip

2) Wire routers in backend/main.py:
   from backend.addons.security_ext import router as security_router
   app.include_router(security_router)
   from backend.addons.stripe_ext_live import router as stripe_live_router
   app.include_router(stripe_live_router)
   # Ensure notifications use backend.addons.notify_provider.send_email under the hood.

3) Env (Replit Secrets):
   AUTH_RATE_LIMIT=5
   AUTH_RATE_WINDOW_SEC=60
   SESSION_TTL_SEC=1800
   CSRF_SECRET=changeme
   STRIPE_TEST=1
   STRIPE_SIGNING_SECRET=whsec_dev
   NOTIFY_MODE=mock

4) Start backend:
   bash scripts/serve_api.sh

5) Run tests:
   PYTHONPATH=. python auth_pack_v0_2_0/run.py
   PYTHONPATH=. python subscription_pack_v0_2_0/run.py
   PYTHONPATH=. python notify_pack_v0_2_0/run.py

6) Release gate integration:
   PYTHONPATH=. python release_gate/patch_run_all.py
