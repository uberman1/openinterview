# Stage 7 - UAT Launch Pack Complete ✅

## Overview

Stage 7 is a **UAT Launch Pack** that combines provider sandbox testing (Stage 6) with comprehensive end-to-end smoke tests for critical application flows. It validates the entire application stack is ready for User Acceptance Testing by confirming auth, subscriptions, profiles, availability, uploads, notifications, and governance signals all work correctly.

## 🚀 What's Deployed

### Critical Flow Tests (10 checks)

**1. Authentication Flow**
- ✅ Signup endpoint validation
- ✅ OTP verification (mock/sandbox)

**2. Subscription Flow**
- ✅ Stripe checkout (sandbox mode)

**3. Profile Management**
- ✅ Profile creation
- ✅ Profile retrieval by slug

**4. Availability System**
- ✅ Slot creation
- ✅ Slot retrieval

**5. File Uploads**
- ✅ Metadata processing

**6. Notifications**
- ✅ Generic email send

### Governance Checks (3 checks)

**1. Extended Health**
- ✅ Detailed system health endpoint

**2. Prometheus Metrics**
- ✅ Process uptime validation

**3. Audit Export**
- ✅ Audit trail with PII redaction

## 📁 File Structure

```
stage7/
├── run_stage7.py                    # Main orchestrator ✨
├── patch_backend_imports.py         # Backend helper ✨
├── tests_api/
│   ├── __init__.py
│   ├── smoke_critical_flows.py      # Critical flows ✨
│   └── governance_checks.py         # Governance ✨
├── requirements.txt                 # Dependencies
└── README.md                        # Comprehensive guide

public/
└── stage7_status.html               # Status page ✨

qa/stage7/v0.7.0/
├── tests.json                       # Results (machine)
└── tests.txt                        # Results (human)

scripts/
├── apply_stage7_gate_patch.py       # Gate integration ✨
└── update_test2_index_stage7.py     # Infrastructure ✨

ci/snippets/
└── stage7_uat_gate.yml             # GitHub Actions ✨

README_STAGE7.md                     # Quick reference
STAGE7_COMPLETE.md                   # This file
```

## 🎯 Environment Configuration

### Default (Safe)

| Variable | Default | Behavior |
|----------|---------|----------|
| `OI_BASE_URL` | `http://127.0.0.1:8000` | Local API |
| `STRIPE_TEST` | `0` | Mocked |
| `NOTIFY_MODE` | `mock` | File only |

### UAT Mode

| Variable | Value | Behavior |
|----------|-------|----------|
| `OI_BASE_URL` | API URL | Target server |
| `STRIPE_TEST` | `1` | Sandbox mode |
| `NOTIFY_MODE` | `sandbox` | Provider sandbox |
| `FEATURE_SHADOW_CALLS` | `1` | Optional validation |

## 🚀 Usage Guide

### Local Development

**1. Start backend:**
```bash
bash scripts/serve_api.sh
```

**2. Patch backend (one-time):**
```bash
python stage7/patch_backend_imports.py
```

**3. Run Stage 7:**
```bash
export OI_BASE_URL="http://127.0.0.1:8000"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
PYTHONPATH=. python stage7/run_stage7.py
```

**4. View results:**
```
Artifacts: qa/stage7/v0.7.0/tests.json
Status: /stage7_status.html
```

### Via Release Gate

**Run complete pipeline:**
```bash
PYTHONPATH=. python release_gate/run_all.py
```

**Execution order:**
1. Packs 1-9 → Feature validation
2. Bundle A → API security
3. Bundle B → UI quality
4. Bundle C → Governance
5. Stage 2 → Guardrails
6. Stage 3 → Staging pilot
7. Stage 4 → Go-Live
8. Stage 5 → UAT feedback
9. Stage 6 → Provider sandbox
10. **Stage 7 → UAT Launch** ✨

## 📊 Results Format

### tests.json (PASS Example)

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

## ✅ Pass Criteria

**Stage 7 passes when:**

1. ✅ **All Smoke Flows**: 10/10 critical flow tests pass
   - Health, Auth (signup/verify), Stripe, Profile (create/get), Availability (create/list), Uploads, Notify
2. ✅ **All Governance**: 3/3 governance checks pass
   - Extended health, Prometheus metrics, Audit export

**Any failure results in FAIL status.**

## 🔧 Backend Integration

### Automatic Patch

**Run helper:**
```bash
python stage7/patch_backend_imports.py
```

**What it does:**
- Checks if Stage 6 routers exist
- Adds stripe_live_ext and notify_live_ext imports
- Wires routers into FastAPI app
- Safe - checks before modifying

### Manual Integration

**Add to `backend/main.py`:**
```python
# Imports
from backend.addons.stripe_live_ext import router as stripe_live_router
from backend.addons.notify_live_ext import router as notify_live_router

# Registration
app.include_router(stripe_live_router)
app.include_router(notify_live_router)
```

## 🎯 CI/CD Integration

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

## 🐛 Troubleshooting

### Health Check Failing

**Problem:** Cannot reach backend

**Solution:**
```bash
# Start backend
bash scripts/serve_api.sh

# Test manually
curl http://127.0.0.1:8000/health
```

### Auth Flow Failing

**Problem:** OTP not found

**Debug:**
```bash
# Check notify outbox
curl http://127.0.0.1:8000/api/notify/outbox

# Set sandbox mode
export NOTIFY_MODE=sandbox
```

### Stripe Checkout Failing

**Problem:** Endpoint not responding

**Solution:**
```bash
# Patch backend
python stage7/patch_backend_imports.py

# Restart
bash scripts/serve_api.sh
```

### Governance Checks Failing

**Problem:** Endpoints missing

**Verify:**
```bash
# Test each endpoint
curl http://127.0.0.1:8000/health/extended
curl http://127.0.0.1:8000/metrics
curl http://127.0.0.1:8000/api/audit
```

## 📈 Infrastructure Tracking

**Update test2.html:**
```bash
python scripts/update_test2_index_stage7.py
```

**Creates row with:**
- Status page link (`/stage7_status.html`)
- Documentation link (`/README_STAGE7.md`)
- Results link (`/qa/stage7/v0.7.0/tests.txt`)

## 🔄 Integration with Quality System

### Complete Quality Pipeline (9 Gates)

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

## 📚 Documentation

**Quick References:**
- `README_STAGE7.md` - Quick start guide

**Comprehensive:**
- `stage7/README.md` - Full documentation
- `STAGE7_COMPLETE.md` - This file

**System Overview:**
- `QUALITY_GATES_COMPLETE.md` - All 9 gates documented

## 🎉 Success Summary

**Stage 7 is UAT-ready!**

- ✅ Critical flow tests deployed (10 checks)
- ✅ Governance checks deployed (3 checks)
- ✅ Backend integration helper ready
- ✅ Orchestrator functional
- ✅ Status page available
- ✅ Release gate integration complete
- ✅ CI/CD workflow ready
- ✅ Complete documentation

## 🚀 Best Practices

### Pre-UAT Checklist

Before running Stage 7:

- [ ] Backend running and healthy
- [ ] Stage 6 routers integrated
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Database/storage ready
- [ ] All previous stages passed

### Running in Environments

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
export STRIPE_TEST=0
export NOTIFY_MODE=live
```

### Interpreting Results

**All PASS ✅**
- Application ready for UAT
- All critical flows validated
- Governance healthy

**Any FAIL ❌**
- Review failed checks
- Debug specific endpoints
- Fix before UAT

**ERROR Status ⚠️**
- Exception during testing
- Check error in summary
- Verify backend running

## 🎊 **Your UAT Launch System is Complete!**

**Stage 7 provides:**
1. ✅ **Complete Flow Coverage** - Auth to notifications
2. ✅ **Governance Validation** - Health, metrics, audit
3. ✅ **Provider Sandbox** - Safe Stripe/email testing
4. ✅ **Backend Integration** - Auto-patch helper
5. ✅ **Release Gate Ready** - Full pipeline integration
6. ✅ **CI/CD Automation** - GitHub Actions workflow

**Launch your UAT with confidence!** 🎉

---

*Last Updated: 2025-10-12*  
*Stage 7 Version: v0.7.0*  
*Status: ✅ COMPLETE*
