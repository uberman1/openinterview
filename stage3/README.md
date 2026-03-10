# Stage 3 — Staging Pilot & Production Hardening (v0.3.0)

## Overview

Stage 3 validates production readiness by running a **staging pilot** against the live FastAPI backend in API mode. It combines smoke tests for critical endpoints with a full release gate run, capturing all results for traceability and infrastructure tracking.

## What It Does

1. **Smoke Tests** - Validates core API endpoints:
   - Health endpoint (`/health`)
   - Auth CSRF (`/api/auth/csrf`)
   - Security CSRF (`/api/security/csrf`)
   - Stripe webhook signature validation
   - Notification outbox (`/api/notify/outbox`)

2. **Release Gate (API Mode)** - Runs all 12 release gate packs with `HOME_API=1`

3. **Artifact Collection** - Saves results to `qa/stage3/v0.3.0/`:
   - `smoke_results.json` - Smoke test results
   - `summary.json` - Overall status
   - `release_gate_stdout.txt` - Release gate output
   - `release_gate_stderr.txt` - Release gate errors
   - `tests.txt` - Human-readable summary

4. **Infrastructure Tracking** - Updates `public/test2.html` with Stage 3 row

## Quick Start

### 1. Start Backend

```bash
# Option A: Using serve script
bash scripts/serve_api.sh

# Option B: Manual start
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Run Stage 3

```bash
export HOME_API=1
export HEALTH_URL="http://127.0.0.1:8000/health"
export OI_BASE_URL="http://127.0.0.1:8000"
PYTHONPATH=. python stage3/run_stage3.py
```

### 3. Review Results

Check artifacts in `qa/stage3/v0.3.0/`:
- `summary.json` - Overall status
- `smoke_results.json` - Smoke test details
- `tests.txt` - Quick summary

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HOME_API` | Enable API mode | `1` |
| `OI_BASE_URL` | Base URL for API | `http://127.0.0.1:8000` |
| `HEALTH_URL` | Health endpoint URL | `{OI_BASE_URL}/health` |

## File Structure

```
stage3/
├── smoke_tests.py           # Smoke test implementation
├── run_stage3.py            # Main orchestrator
├── requirements.txt         # Python dependencies
├── monitoring_setup.md      # Monitoring guidelines
├── pilot_checklist.md       # Pilot validation checklist
├── rollout_plan.md          # Rollout procedure
└── README.md                # This file

qa/stage3/v0.3.0/
├── smoke_results.json       # Smoke test results
├── summary.json             # Overall summary
├── release_gate_stdout.txt  # Release gate output
├── release_gate_stderr.txt  # Release gate errors
└── tests.txt                # Human-readable summary

scripts/
└── update_test2_index_stage3.py  # Infrastructure tracking

ci/snippets/
└── stage3_pipeline.yml      # GitHub Actions workflow
```

## Smoke Tests

### Health Check
```bash
GET /health
Expected: 200 OK, {"status": "ok"} or {"healthy": true}
```

### Auth CSRF
```bash
GET /api/auth/csrf
Expected: 200 OK
```

### Security CSRF
```bash
GET /api/security/csrf
Expected: 200 OK
```

### Stripe Webhook Signature
```bash
POST /api/stripe/webhook
Headers: Content-Type: application/json
Body: {}
Expected: 400/401/403 (missing signature)
```

### Notify Outbox
```bash
GET /api/notify/outbox
Expected: 200 OK
```

## Results Format

### smoke_results.json
```json
{
  "started": "2025-10-12T12:00:00Z",
  "finished": "2025-10-12T12:00:05Z",
  "status": "PASS",
  "checks": [
    {
      "check": "health",
      "status": "PASS",
      "status_code": 200,
      "body": "{\"status\":\"ok\"}"
    },
    {
      "check": "auth_csrf",
      "status": "PASS",
      "status_code": 200
    }
  ]
}
```

### summary.json
```json
{
  "stage": "stage3_v0_3_0",
  "started": "2025-10-12T12:00:00Z",
  "finished": "2025-10-12T12:00:30Z",
  "base_url": "http://127.0.0.1:8000",
  "health_url": "http://127.0.0.1:8000/health",
  "smoke": {
    "status": "PASS",
    "checks": [...]
  },
  "release_gate_exit_code": 0,
  "status": "PASS"
}
```

## Pilot Checklist

Before proceeding to production:

- [ ] Backend running and reachable
- [ ] Release Gate passes in API mode (HOME_API=1)
- [ ] Health endpoint returns ok
- [ ] Invite 5–10 pilot users (auth pack flows)
- [ ] Stripe test mode: plan purchase + cancel
- [ ] Availability booking happy path
- [ ] Profile creation + shareable profile copy
- [ ] Upload avatar and confirm in profiles
- [ ] No PII or PAN stored in app (last4 only)
- [ ] test2.html updated with Stage 3 row

## Rollout Plan

1. **Freeze**: Ensure Stage 2 locks & all packs PASS
2. **Staging Pilot**: Run Stage 3 orchestrator; verify artifacts
3. **Human Testing**: Pilot users complete full flows
4. **Observability**: Enable logs & error tracking; capture incidents
5. **Go/No-Go**: If stable, proceed to Stage 4 (Production cut)

## Monitoring Setup (MVP)

- Enable request logs and error logs in backend
- Create uptime probe to `/health` (every minute)
- Capture Stripe webhook successes/errors to logs
- Keep artifacts from Stage 3 runs for traceability

## CI/CD Integration

### GitHub Actions

```yaml
name: Stage 3 - Staging Pilot
on:
  workflow_dispatch:
  pull_request:

jobs:
  stage3:
    runs-on: ubuntu-latest
    env:
      HOME_API: "1"
      HEALTH_URL: "http://127.0.0.1:8000/health"
      OI_BASE_URL: "http://127.0.0.1:8000"
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      
      - name: Install backend deps
        run: python -m pip install -r backend/requirements.txt
      
      - name: Start API (background)
        run: |
          nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
          sleep 3
      
      - name: Run Stage 3 Orchestrator
        run: PYTHONPATH=. python stage3/run_stage3.py
      
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: stage3-results
          path: qa/stage3/v0.3.0/**
```

Use: `ci/snippets/stage3_pipeline.yml`

## Troubleshooting

### Backend Not Running
```bash
# Check if backend is running
curl http://127.0.0.1:8000/health

# Start if needed
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Smoke Tests Failing
```bash
# Check smoke results
cat qa/stage3/v0.3.0/smoke_results.json | python -m json.tool

# Review individual checks
cat qa/stage3/v0.3.0/smoke_results.json | jq '.checks[] | select(.status == "FAIL")'
```

### Release Gate Failing
```bash
# Check release gate logs
cat qa/stage3/v0.3.0/release_gate_stdout.txt
cat qa/stage3/v0.3.0/release_gate_stderr.txt

# Run release gate manually
export HOME_API=1
PYTHONPATH=. python release_gate/run_all.py
```

### Infrastructure Tracking
```bash
# Update test2.html manually
python scripts/update_test2_index_stage3.py

# Verify update
grep -A 5 "Stage 3" public/test2.html
```

## Success Criteria

**Stage 3 passes when:**
- All smoke tests pass (5/5)
- Release gate exits with code 0
- Artifacts saved to `qa/stage3/v0.3.0/`
- Infrastructure tracking updated
- Overall status: PASS

## Next Steps

After Stage 3 passes:
1. Review pilot checklist
2. Conduct human testing with pilot users
3. Set up monitoring and alerting
4. Prepare for Stage 4 (Production deployment)

---

*Stage 3 Version: v0.3.0*  
*Status: Ready for staging pilot*
