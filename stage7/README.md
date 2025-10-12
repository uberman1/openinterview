# Stage 7 — UAT Launch Pack (v0.7.0)

## Overview

Stage 7 is a **UAT Launch Pack** that combines provider sandbox testing with comprehensive end-to-end smoke tests for critical application flows. It validates the entire application stack is ready for User Acceptance Testing by confirming auth, subscriptions, profiles, availability, uploads, notifications, and governance signals all work correctly.

## What It Validates

### 1. Critical Application Flows (10 checks)

**Authentication:**
- **Signup**: User registration endpoint
- **Verify**: OTP verification flow (mock/sandbox)

**Subscriptions:**
- **Stripe Checkout**: Payment flow (sandbox mode, no real charges)

**Profiles:**
- **Create**: Profile creation endpoint
- **Get**: Profile retrieval by slug

**Availability:**
- **Create**: Availability slot creation
- **List**: Availability slot retrieval

**Uploads:**
- **Metadata**: File upload metadata handling

**Notifications:**
- **Send**: Generic notification delivery

### 2. Governance & Operations (3 checks)

**Health:**
- **Extended Health**: Detailed system health endpoint

**Metrics:**
- **Prometheus**: Process uptime and metrics endpoint

**Audit:**
- **Export**: Audit trail list with PII redaction

## Test Modules

### Smoke Critical Flows (`smoke_critical_flows.py`)

**Complete user journey simulation:**

1. **Health Check** - Validates `/health` endpoint responds ok
2. **User Signup** - Creates test user with unique email
3. **OTP Verification** - Retrieves and validates OTP (from response or outbox)
4. **Stripe Checkout** - Tests payment flow in sandbox mode
5. **Profile Create** - Creates user profile with unique slug
6. **Profile Get** - Retrieves profile by slug
7. **Availability Create** - Adds availability slots
8. **Availability List** - Retrieves availability data
9. **Upload Metadata** - Processes file upload metadata
10. **Notification Send** - Sends generic notification

**All tests use:**
- Unique identifiers (UUIDs) to avoid conflicts
- Requests library for HTTP calls
- Sandbox/mock modes for safety

### Governance Checks (`governance_checks.py`)

**Operational readiness validation:**

1. **Extended Health** - `/health/extended` endpoint
2. **Prometheus Metrics** - `/metrics` with uptime validation
3. **Audit Export** - `/api/audit` with redaction check

## Environment Variables

| Variable | Description | Default | UAT Mode |
|----------|-------------|---------|----------|
| `OI_BASE_URL` | API base URL | `http://127.0.0.1:8000` | Required |
| `STRIPE_TEST` | Stripe sandbox mode | `0` | `1` |
| `NOTIFY_MODE` | Email provider mode | `mock` | `sandbox` |
| `FEATURE_SHADOW_CALLS` | Shadow validation | `0` | `1` (optional) |

## Usage

### Prerequisites

**1. Backend must be running:**
```bash
bash scripts/serve_api.sh
```

**2. Stage 6 routers wired in:**
```bash
# One-time: patch backend/main.py
python stage7/patch_backend_imports.py
```

**3. Install dependencies:**
```bash
pip install -r stage7/requirements.txt
```

### Run Stage 7

**Local Development:**
```bash
export OI_BASE_URL="http://127.0.0.1:8000"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
PYTHONPATH=. python stage7/run_stage7.py
```

**Staging/Production:**
```bash
export OI_BASE_URL="https://staging.yourapp.com"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
PYTHONPATH=. python stage7/run_stage7.py
```

**Via Release Gate:**
```bash
# Runs all gates including Stage 7
PYTHONPATH=. python release_gate/run_all.py
```

## File Structure

```
stage7/
├── run_stage7.py                    # Main orchestrator
├── patch_backend_imports.py         # Backend router helper
├── tests_api/
│   ├── __init__.py
│   ├── smoke_critical_flows.py      # Critical flow tests
│   └── governance_checks.py         # Governance tests
├── requirements.txt                 # Dependencies
└── README.md                        # This file

public/
└── stage7_status.html               # Status page

qa/stage7/v0.7.0/
├── tests.json                       # Machine-readable results
└── tests.txt                        # Human-readable results

scripts/
├── apply_stage7_gate_patch.py       # Release gate integration
└── update_test2_index_stage7.py     # Infrastructure tracking

ci/snippets/
└── stage7_uat_gate.yml             # GitHub Actions workflow

README_STAGE7.md                     # Quick reference
```

## Results Format

### tests.json

```json
{
  "stage7_version": "v0.7.0",
  "timestamp": "2025-10-12T16:00:00.000Z",
  "smoke_critical_flows": {
    "health": ["PASS", "{\"status\":\"ok\"}"],
    "auth_signup": ["PASS", "{...}"],
    "auth_verify": ["PASS", "{...}"],
    "stripe_checkout": ["PASS", "{...}"],
    "profile_create": ["PASS", "{...}"],
    "profile_get": ["PASS", "{...}"],
    "availability_create": ["PASS", "{...}"],
    "availability_list": ["PASS", "{...}"],
    "uploads_meta": ["PASS", "{...}"],
    "notify_generic": ["PASS", "{...}"]
  },
  "governance": {
    "health_extended": ["PASS", "{...}"],
    "metrics_prom": ["PASS", "process_uptime_seconds..."],
    "audit_list": ["PASS", "[{...}]"]
  },
  "status": "PASS"
}
```

### tests.txt (Human-Readable)

```
Stage 7 UAT Pack v0.7.0
Status: PASS
Timestamp: 2025-10-12T16:00:00.000Z

Smoke:
- health: PASS
- auth_signup: PASS
- auth_verify: PASS
- stripe_checkout: PASS
- profile_create: PASS
- profile_get: PASS
- availability_create: PASS
- availability_list: PASS
- uploads_meta: PASS
- notify_generic: PASS

Governance:
- health_extended: PASS
- metrics_prom: PASS
- audit_list: PASS
```

## Pass Criteria

**Stage 7 passes when:**

1. ✅ **All Smoke Flows**: 10/10 critical flow tests pass
2. ✅ **All Governance**: 3/3 governance checks pass

**Any failure results in FAIL status.**

## Backend Router Integration

### Automatic Patch

```bash
python stage7/patch_backend_imports.py
```

**What it does:**
- Checks if Stage 6 routers already imported
- Adds imports for stripe_live_ext and notify_live_ext
- Wires routers into FastAPI app
- Creates backup before modifying

### Manual Integration

**Add to `backend/main.py`:**
```python
# Imports (after existing imports)
from backend.addons.stripe_live_ext import router as stripe_live_router
from backend.addons.notify_live_ext import router as notify_live_router

# Router registration (after app creation)
app.include_router(stripe_live_router)
app.include_router(notify_live_router)
```

## Release Gate Integration

### Apply Integration

```bash
python scripts/apply_stage7_gate_patch.py
```

**What it does:**
- Modifies `release_gate/run_all.py`
- Adds Stage 7 to PACKS list
- Creates backup at `.bak_stage7`

### Run Complete Pipeline

```bash
# All gates: Packs 1-9, Bundles A/B/C, Stages 2-7
PYTHONPATH=. python release_gate/run_all.py
```

**Execution flow:**
1. Packs 1-9 (Feature validation)
2. Bundle A (API security)
3. Bundle B (UI quality)
4. Bundle C (Governance)
5. Stage 2 (Guardrails)
6. Stage 3 (Staging)
7. Stage 4 (Go-Live)
8. Stage 5 (UAT feedback)
9. Stage 6 (Provider sandbox)
10. **Stage 7 (UAT Launch)** ✨

## CI/CD Integration

### GitHub Actions

**Workflow:** `ci/snippets/stage7_uat_gate.yml`

```yaml
name: Stage 7 UAT Gate

on:
  workflow_dispatch: {}

jobs:
  stage7:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r stage7/requirements.txt
      - name: Start API
        run: |
          nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
          sleep 3
      - name: Run Stage 7
        env:
          OI_BASE_URL: http://127.0.0.1:8000
          STRIPE_TEST: "1"
          NOTIFY_MODE: sandbox
        run: PYTHONPATH=. python stage7/run_stage7.py
      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: stage7-artifacts
          path: qa/stage7/v0.7.0/
```

## Troubleshooting

### Health Check Failing

**Problem:** Cannot reach `/health` endpoint

**Debug:**
```bash
# Test manually
curl http://127.0.0.1:8000/health

# Start backend
bash scripts/serve_api.sh
```

### Auth Signup/Verify Failing

**Problem:** OTP not found

**Check:**
1. Notify provider configured: `NOTIFY_MODE=sandbox`
2. OTP returned in response or outbox
3. `/api/notify/outbox` endpoint accessible

**Debug:**
```bash
# Check outbox
curl http://127.0.0.1:8000/api/notify/outbox

# Manual signup
curl -X POST http://127.0.0.1:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","invite":"TEST"}'
```

### Stripe Checkout Failing

**Problem:** Checkout endpoint not responding

**Check:**
1. Stage 6 routers wired in backend
2. `STRIPE_TEST=1` environment set
3. `/api/stripe/checkout` endpoint exists

**Debug:**
```bash
# Patch backend if needed
python stage7/patch_backend_imports.py

# Restart backend
bash scripts/serve_api.sh

# Test manually
curl -X POST http://127.0.0.1:8000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","email":"test@example.com"}'
```

### Profile/Availability Failing

**Problem:** Endpoints not found

**Check:**
1. Backend routes registered
2. Database/storage initialized
3. Correct endpoint paths

**Verify:**
```bash
# Check available routes
curl http://127.0.0.1:8000/docs
```

### Governance Checks Failing

**Problem:** Extended health/metrics/audit endpoints missing

**Check:**
1. Bundle C extensions installed
2. Metrics/audit routers registered
3. Endpoints accessible

**Debug:**
```bash
# Test each endpoint
curl http://127.0.0.1:8000/health/extended
curl http://127.0.0.1:8000/metrics
curl http://127.0.0.1:8000/api/audit
```

## Best Practices

### Pre-UAT Checklist

Before running Stage 7:

- [ ] Backend running and healthy
- [ ] Stage 6 routers integrated
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Database/storage ready
- [ ] Previous stages passed

### Running in Different Environments

**Development:**
```bash
export OI_BASE_URL="http://127.0.0.1:8000"
export STRIPE_TEST=1
export NOTIFY_MODE=mock
```

**Staging:**
```bash
export OI_BASE_URL="https://staging.yourapp.com"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
```

**Production (Pre-UAT):**
```bash
export OI_BASE_URL="https://yourapp.com"
export STRIPE_TEST=0  # Use real Stripe if needed
export NOTIFY_MODE=live
```

### Interpreting Results

**All PASS:**
- Application ready for UAT
- All critical flows working
- Governance signals healthy

**Any FAIL:**
- Review failed checks in tests.json
- Debug specific endpoints
- Fix issues before UAT

**ERROR Status:**
- Exception during testing
- Check error message in summary
- Verify backend is running

## Infrastructure Tracking

**Update test2.html:**
```bash
python scripts/update_test2_index_stage7.py
```

**Verify:**
```bash
grep -A 5 "Stage 7" public/test2.html
```

**Creates section with links to:**
- Status page (`/stage7_status.html`)
- Documentation (`/README_STAGE7.md`)
- Test results (`/qa/stage7/v0.7.0/tests.txt`)

## Integration with Quality System

Stage 7 completes the **9-gate quality pipeline**:

| Gate | Focus | Coverage | Status |
|------|-------|----------|--------|
| **Packs 1-9** | Features | 45+ tests | ✅ READY |
| **Bundle A** | API Security | 7 tests | ✅ PASS |
| **Bundle B** | UI Quality | 28+ tests | ✅ PASS |
| **Bundle C** | Governance | 13+ tests | ✅ PASS |
| **Stage 2** | Guardrails | 13 files | ✅ PASS |
| **Stage 3** | Staging | 5 checks | ✅ READY |
| **Stage 4** | Go-Live | 4 checks | ✅ READY |
| **Stage 5** | UAT Feedback | 3 checks | ✅ READY |
| **Stage 6** | Providers | 2 checks | ✅ READY |
| **Stage 7** | UAT Launch | 13 checks | ✅ READY |

**Total:** 138+ quality checks across 9 quality gates!

## Success Criteria

**Stage 7 is successful when:**

- [x] Critical flow tests module created
- [x] Governance checks module created
- [x] Orchestrator functional
- [x] Backend router integration complete
- [x] Artifacts saved correctly
- [x] Release gate integration complete
- [x] Infrastructure tracking updated

---

*Stage 7 Version: v0.7.0*  
*Status: Ready for UAT Launch*
