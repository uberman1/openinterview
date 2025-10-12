# Stage 7 – UAT Launch Pack v0.7.0

This pack bundles **Provider Sandbox & Shadow-Mode (Stage 6)** and adds **UAT orchestration**:
- Runs end‑to‑end API smoke tests against a base URL (default `http://127.0.0.1:8000`)
- Confirms critical flows: auth, subscription, profiles, availability, uploads, notifications
- Verifies governance/ops signals: extended health, metrics, audit export
- Saves artifacts to `qa/stage7/v0.7.0/`
- Wires into the Release Gate as the final pre‑UAT step
- Updates `public/test2.html` under a new section **"Release Gate – UAT"**

## Quick Start

1) Ensure backend is running (FastAPI):
```bash
bash scripts/serve_api.sh
```
2) (One‑time) Ensure Stage 6 routers are included in `backend/main.py`:
```python
from backend.addons.stripe_live_ext import router as stripe_live_router
from backend.addons.notify_live_ext import router as notify_live_router
app.include_router(stripe_live_router)
app.include_router(notify_live_router)
```
Or run the helper:
```bash
python stage7/patch_backend_imports.py
```

3) Install deps:
```bash
pip install -r stage7/requirements.txt
```

4) Run Stage 7:
```bash
export OI_BASE_URL="http://127.0.0.1:8000"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
export FEATURE_SHADOW_CALLS=1
PYTHONPATH=. python stage7/run_stage7.py
```

Artifacts:
- `qa/stage7/v0.7.0/tests.json`
- `qa/stage7/v0.7.0/tests.txt`

5) Wire into Release Gate and index:
```bash
python scripts/apply_stage7_gate_patch.py
python scripts/update_test2_index_stage7.py
```

## Env Flags
- `OI_BASE_URL` (default `http://127.0.0.1:8000`)
- `STRIPE_MOCK=1` (default) or `STRIPE_TEST=1` (sandbox), `FEATURE_SHADOW_CALLS=1`
- `NOTIFY_MODE=mock|sandbox`

## CI Example
See `ci/snippets/stage7_uat_gate.yml`.
