
OPENINTERVIEW — MVP Backend Pack v0.1.0

Purpose
- Provide a minimal backend that satisfies the existing QA packs in API-mode and unlocks true end-to-end flows.
- Stays security-first (no PAN stored; Stripe handled via mock/live toggle).

What’s included
- FastAPI app with routes for health, auth reset glue, Stripe (mock/live), profiles, availability, uploads metadata.
- SQLite persistence via SQLAlchemy (single file db: app.db).
- Mock Stripe driver (default) + switch to live later via env.
- Scripts to run locally/Replit, and a CI snippet that integrates with Release Gate & Policies.

Quick start (Replit or local)
1) Unzip at repo root
   unzip mvp_backend_pack_v0_1_0.zip -d .

2) Install & run API
   pip install -r backend/requirements.txt
   # start API (port 8000)
   bash scripts/serve_api.sh

3) Run the Release Gate with API health enabled (separate shell)
   export HOME_API=1
   export HEALTH_URL="http://127.0.0.1:8000/health"
   PYTHONPATH=. python release_gate/run_all.py

Env config (backend/.env.sample)
- STRIPE_MODE=mock|live (default mock)
- DATABASE_URL=sqlite:///./app.db
- BASE_URL=http://127.0.0.1:8000
- PORT=8000

OpenAPI docs
- Visit http://127.0.0.1:8000/docs  (Swagger UI)
- http://127.0.0.1:8000/openapi.json

CI wiring (example steps)
- Start API → run policies (baseline + health) → run release gate → upload artifacts.
See ci/mvp_backend_example.yml inside this bundle.

Security guidance
- Do not store card numbers (PAN). We only store Stripe ids and last4. Stripe hosted checkout/portal handle payments.
- Keep CSP and CSRF in the frontend as enforced by the packs.
- Use HTTPS in production and secure cookies for sessions when added.

This pack was generated at: 2025-10-11T20:03:34.277071Z
