# Stage 3 — Staging Pilot & Production Hardening (v0.3.0)

## Quick Start

Stage 3 runs a **staging pilot** against your live API-mode backend and records artifacts + status in `public/test2.html`.

### What it does
- Runs staging smoke tests (requests-based) against FastAPI backend
- Executes Release Gate in API mode (HOME_API=1)
- Saves results under `qa/stage3/v0.3.0/`
- Adds Stage 3 row to `public/test2.html`

### Usage

**1. Start backend:**
```bash
bash scripts/serve_api.sh
```

**2. Run Stage 3:**
```bash
export HOME_API=1
export HEALTH_URL="http://127.0.0.1:8000/health"
export OI_BASE_URL="http://127.0.0.1:8000"
PYTHONPATH=. python stage3/run_stage3.py
```

**3. Check results:**
```bash
cat qa/stage3/v0.3.0/summary.json | python -m json.tool
```

### File Locations

**Scripts:** `stage3/` directory
- `smoke_tests.py` - API smoke tests
- `run_stage3.py` - Full orchestrator
- `requirements.txt` - Dependencies

**Infrastructure:** `scripts/`
- `update_test2_index_stage3.py` - Add to test2.html

**CI/CD:** `ci/snippets/`
- `stage3_pipeline.yml` - GitHub Actions

**Documentation:** `stage3/README.md` (comprehensive guide)

### Smoke Tests (5 total)

- ✅ Health endpoint (`/health`)
- ✅ Auth CSRF (`/api/auth/csrf`)
- ✅ Security CSRF (`/api/security/csrf`)
- ✅ Stripe webhook signature validation
- ✅ Notify outbox (`/api/notify/outbox`)

### Status

Stage 3 passes when:
- All smoke tests pass (5/5)
- Release gate exits with code 0
- Artifacts saved successfully
- Infrastructure tracking updated

See `stage3/README.md` for detailed instructions.
