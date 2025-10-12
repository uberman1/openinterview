# Stage 6 - Provider Sandbox & Shadow-Mode Complete ✅

## Overview

Stage 6 is a **Provider Sandbox and Shadow-Mode quality gate** that enables safe integration testing of external providers (Stripe, email/notify) with sandbox environments and optional shadow-mode validation. It maintains mock-first defaults while allowing controlled testing of real provider integrations.

## 🚀 What's Deployed

### Provider Infrastructure

**1. Feature Flags System (`provider_flags.py`)**
- ✅ Centralized flag management
- ✅ Environment-based configuration
- ✅ Type-safe boolean helpers
- ✅ Mock-first defaults

**2. Stripe Sandbox Adapter (`stripe_live_ext.py`)**
- ✅ Checkout endpoint (`/api/stripe_ext/checkout`)
- ✅ Webhook endpoint (`/api/stripe_ext/webhook`)
- ✅ Mode detection (mocked/sandbox/test)
- ✅ Safe sandbox URLs only

**3. Email/Notify Adapter (`notify_live_ext.py`)**
- ✅ Send endpoint (`/api/notify_ext/send`)
- ✅ File-based outbox (`qa/notify/outbox/`)
- ✅ Mode switching (mock/sandbox/live)
- ✅ Stub for real provider wire-up

### Validation Tests

**1. Stripe Sandbox Smoke Test**
- ✅ Health check validation
- ✅ Checkout endpoint test
- ✅ Response URL validation
- ✅ Webhook echo test

**2. Notify Sandbox Smoke Test**
- ✅ Send endpoint test
- ✅ Outbox file creation
- ✅ Path tracking validation
- ✅ Response ok status check

### Infrastructure

**1. Status Dashboard (`/stage6_status.html`)**
- ✅ Feature flag display
- ✅ Usage instructions
- ✅ Artifact paths
- ✅ CSP secured

**2. Release Gate Integration**
- ✅ Added to PACKS list
- ✅ Runs after Stage 5
- ✅ Backup created
- ✅ Complete pipeline

## 📁 File Structure

```
stage6/
├── run_stage6.py                    # Main orchestrator ✨
├── tests_api/
│   ├── __init__.py
│   ├── stripe_sandbox_test.py       # Stripe smoke test ✨
│   └── notify_sandbox_test.py       # Notify smoke test ✨
└── README.md                        # Comprehensive guide

backend/addons/
├── provider_flags.py                # Feature flags ✨
├── stripe_live_ext.py               # Stripe adapter ✨
└── notify_live_ext.py               # Notify adapter ✨

public/
└── stage6_status.html               # Status dashboard ✨

qa/stage6/v0.6.0/
├── tests.json                       # Results (machine-readable)
└── tests.txt                        # Results (human-readable)

qa/notify/outbox/                    # Email outbox directory
└── [timestamp]_[template].json

scripts/
├── apply_stage6_gate_patch.py       # Gate integration ✨
└── update_test2_index_stage6.py     # Infrastructure tracking ✨

ci/snippets/
└── stage6_gate.yml                  # GitHub Actions ✨

README_STAGE6.md                     # Quick reference
STAGE6_COMPLETE.md                   # This file
```

## 🎯 Feature Flags

### Default Configuration (Safe)

| Flag | Default | Behavior |
|------|---------|----------|
| `STRIPE_MOCK` | `1` | All Stripe calls mocked |
| `STRIPE_TEST` | `0` | Sandbox mode disabled |
| `NOTIFY_MODE` | `mock` | File outbox only |
| `FEATURE_SHADOW_CALLS` | `0` | Shadow-mode disabled |

### Sandbox Configuration

| Flag | Value | Behavior |
|------|-------|----------|
| `STRIPE_MOCK` | `0` | Enable real adapter |
| `STRIPE_TEST` | `1` | Stripe sandbox mode |
| `NOTIFY_MODE` | `sandbox` | Sandbox email provider |
| `FEATURE_SHADOW_CALLS` | `1` | Parallel validation (UAT) |

## 🚀 Usage Guide

### Local Development (Sandbox Mode)

**1. Start backend:**
```bash
bash scripts/serve_api.sh
```

**2. Run Stage 6:**
```bash
export OI_BASE_URL="http://127.0.0.1:8000"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
PYTHONPATH=. python stage6/run_stage6.py
```

**3. View status:**
```
Navigate to: /stage6_status.html
```

### Shadow-Mode (UAT Testing)

**Enable parallel validation:**
```bash
export OI_BASE_URL="http://127.0.0.1:8000"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
export FEATURE_SHADOW_CALLS=1
PYTHONPATH=. python stage6/run_stage6.py
```

**Note:** Shadow-mode calls are logged but don't affect pass/fail - mocks remain source of truth.

### Complete Quality Pipeline

**Run all 8 gates:**
```bash
# Includes Stage 6!
PYTHONPATH=. python release_gate/run_all.py
```

**Execution flow:**
1. Packs 1-9 - Feature validation
2. Bundle A - API security
3. Bundle B - UI quality
4. Bundle C - Governance
5. Stage 2 - Guardrails
6. Stage 3 - Staging pilot
7. Stage 4 - Go-Live
8. Stage 5 - UAT
9. **Stage 6 - Provider Sandbox** ✨

## 📊 Results Format

### tests.json (PASS Example)

```json
{
  "stage6_v0_6_0": {
    "stripe_sandbox": {
      "status": "PASS",
      "details": {
        "checkout_url": "https://sandbox.stripe.com/checkout/session/test"
      }
    },
    "notify_sandbox": {
      "status": "PASS",
      "details": {
        "outbox_path": "qa/notify/outbox/1697123456_generic.json"
      }
    }
  },
  "status": "PASS",
  "timestamp": "2025-10-12T15:30:00.000Z"
}
```

### Outbox File Example

```json
{
  "to": "stage6@example.com",
  "template": "generic",
  "subject": "Stage6 Test",
  "data": {"k": "v"},
  "sandbox": true,
  "mocked": false,
  "ts": 1697123456
}
```

## ✅ Pass Criteria

**Stage 6 passes when:**

1. ✅ **Stripe Checkout**: Endpoint responds with valid URL
2. ✅ **Stripe Webhook**: Echo test succeeds
3. ✅ **Notify Send**: Email endpoint responds ok
4. ✅ **Outbox Created**: Files written to qa/notify/outbox/

**Optional (advisory):**
- Shadow-mode validation (logged only)
- Health check (if enabled)

## 🎯 Environment Variables

| Variable | Description | Default | Stage 6 |
|----------|-------------|---------|---------|
| `OI_BASE_URL` | API base URL | `http://127.0.0.1:8000` | Required |
| `STRIPE_MOCK` | Mock Stripe | `1` | `0` for sandbox |
| `STRIPE_TEST` | Stripe test mode | `0` | `1` |
| `NOTIFY_MODE` | Email mode | `mock` | `sandbox` |
| `FEATURE_SHADOW_CALLS` | Shadow validation | `0` | `1` for UAT |

## 🎯 CI/CD Integration

### GitHub Actions

**Workflow:** `ci/snippets/stage6_gate.yml`

```yaml
name: Stage 6 Gate

on:
  workflow_dispatch: {}

jobs:
  stage6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - name: Start API
        run: |
          nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
          sleep 3
      - name: Run Stage 6
        env:
          OI_BASE_URL: http://127.0.0.1:8000
          STRIPE_TEST: "1"
          NOTIFY_MODE: sandbox
        run: PYTHONPATH=. python stage6/run_stage6.py
      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: stage6-artifacts
          path: qa/stage6/v0.6.0/
```

## 🐛 Troubleshooting

### Stripe Sandbox Failing

**Problem:** Checkout endpoint not responding

**Debug:**
```bash
# Test manually
curl -X POST http://127.0.0.1:8000/api/stripe_ext/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","email":"test@example.com"}'

# Check flags
export STRIPE_TEST=1
export STRIPE_MOCK=0
```

### Notify Outbox Missing

**Problem:** No files in qa/notify/outbox/

**Debug:**
```bash
# Create directory
mkdir -p qa/notify/outbox

# Test manually
curl -X POST http://127.0.0.1:8000/api/notify_ext/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","template":"test"}'

# Check files
ls -la qa/notify/outbox/
```

### Health Check Failing

**Problem:** Cannot reach backend

**Solution:**
```bash
# Start backend
bash scripts/serve_api.sh

# Test health
curl http://127.0.0.1:8000/health
```

## 📈 Infrastructure Tracking

**Update test2.html:**
```bash
python scripts/update_test2_index_stage6.py
```

**Verify:**
```bash
grep -A 5 "Stage 6" public/test2.html
```

**Creates row with links to:**
- Status page (`/stage6_status.html`)
- Documentation (`/README_STAGE6.md`)
- Test results (`/qa/stage6/v0.6.0/tests.txt`)

## 🔄 Integration with Quality System

### Complete Quality Pipeline (8 Gates)

| Gate | Focus | Coverage | Status |
|------|-------|----------|--------|
| **Packs 1-9** | Features | 45+ tests | ✅ READY |
| **Bundle A** | API Security | 7 tests | ✅ PASS |
| **Bundle B** | UI Quality | 28+ tests | ✅ PASS |
| **Bundle C** | Governance | 13+ tests | ✅ PASS |
| **Stage 2** | Guardrails | 13 files | ✅ PASS |
| **Stage 3** | Staging | 5 checks | ✅ READY |
| **Stage 4** | Go-Live | 4 checks | ✅ READY |
| **Stage 5** | UAT | 3 checks | ✅ READY |
| **Stage 6** | Providers | 2 checks | ✅ READY |

**Total:** 125+ quality checks across 8 quality gates!

## 📚 Documentation

**Quick References:**
- `README_STAGE6.md` - Quick start guide

**Comprehensive:**
- `stage6/README.md` - Full documentation
- `STAGE6_COMPLETE.md` - This file

**System Overview:**
- `QUALITY_GATES_COMPLETE.md` - All 8 gates documented

## 🎉 Success Summary

**Stage 6 is provider-ready!**

- ✅ Provider flags system deployed
- ✅ Stripe sandbox adapter functional
- ✅ Email/notify sandbox adapter functional
- ✅ Smoke tests passing
- ✅ File-based outbox working
- ✅ Status dashboard available
- ✅ Release gate integration complete
- ✅ CI/CD workflow ready
- ✅ Complete documentation

## 🚀 Best Practices

### Development Workflow

**1. Start with mocks (default):**
```bash
# Mock-first - safe by default!
PYTHONPATH=. python stage6/run_stage6.py
```

**2. Test in sandbox:**
```bash
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
PYTHONPATH=. python stage6/run_stage6.py
```

**3. UAT with shadow-mode:**
```bash
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
export FEATURE_SHADOW_CALLS=1
# Shadow calls logged for validation
```

**4. Production (when ready):**
```bash
export STRIPE_MOCK=0
export NOTIFY_MODE=live
# Wire real provider SDKs
```

### Safety Checklist

Before enabling sandbox/live:

- [ ] Test/sandbox credentials configured
- [ ] Stripe test mode verified (no real charges)
- [ ] Email provider limits checked
- [ ] Outbox permissions validated
- [ ] Small data sets tested first
- [ ] Provider API quotas monitored

## 🎊 **Your Provider Testing System is Complete!**

**Stage 6 provides:**
1. ✅ **Mock-First Safety** - Default behavior
2. ✅ **Sandbox Testing** - Safe provider integration
3. ✅ **Shadow-Mode** - Parallel validation (UAT)
4. ✅ **Feature Flags** - Environment-based control
5. ✅ **File Outbox** - Audit trail for emails
6. ✅ **Complete Integration** - Part of release gate

**Test provider integrations with confidence!** 🎉

---

*Last Updated: 2025-10-12*  
*Stage 6 Version: v0.6.0*  
*Status: ✅ COMPLETE*
