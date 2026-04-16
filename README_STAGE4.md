# Stage 4 – Production Go-Live Readiness v0.4.0

## Quick Start

Stage 4 transforms your test harness into a **production go-live gate** that validates against a real environment URL and saves comprehensive pass/fail artifacts.

### What it checks
- **Health contract**: `/health` must return JSON with any of:
  `{"status":"ok"}`, `{"healthy":true}`, or `{"ok":true}` (HTTP 200).
- **Canary pings**: 5 consecutive 200s, report **p95 latency**;
  default budget: p95 < **1000 ms**.
- **Root headers**: fetch **BASE_URL** and assert **CSP present**.
- **Provider guard** (config only): Stripe, Email provider flags present when `EXPECT_LIVE=1`.

## Quick start (Replit/local)

```bash
# Backend should already be running on your target env
export PROD_URL="http://127.0.0.1:8000"
export HEALTH_URL="$PROD_URL/health"

# Optional: require live providers (otherwise stays advisory)
export EXPECT_LIVE=0
export ALLOW_PROVIDER_MOCK=1

PYTHONPATH=. python stage4/run_stage4.py
```

Artifacts:
- `qa/stage4/v0.4.0/summary.json` – machine-readable
- `qa/stage4/v0.4.0/tests.txt` – human-readable

## CI usage
See `ci/snippets/stage4_pipeline.yml`. It lets you run the gate against any URL via workflow dispatch.

## Index update
`scripts/update_test2_index_stage4.py` appends a row to `public/test2.html`
under **"Stage 4 — Production Go-Live"**.

### File Locations

**Scripts:** `stage4/` directory
- `run_stage4.py` - Main orchestrator
- `requirements.txt` - Dependencies

**Infrastructure:** `scripts/`
- `update_test2_index_stage4.py` - Add to test2.html

**CI/CD:** `ci/snippets/`
- `stage4_pipeline.yml` - GitHub Actions

**Documentation:** `stage4/README.md` (comprehensive guide)

### Checks (4 categories)

- ✅ Health contract validation
- ✅ Canary latency (p95 < 1000ms)
- ✅ CSP header presence
- ✅ Provider configuration

### Status

Stage 4 passes when:
- Health check returns ok (200)
- All 5 canary pings succeed
- p95 latency < 1000ms
- CSP header present
- Provider config valid (or ALLOW_PROVIDER_MOCK=1)

See `stage4/README.md` for detailed instructions.
