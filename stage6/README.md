# Stage 6 — Provider Sandbox & Shadow-Mode (v0.6.0)

## Overview

Stage 6 is a **Provider Sandbox and Shadow-Mode quality gate** that enables safe integration testing of external providers (Stripe, email/notify) with sandbox environments and optional shadow-mode validation. It maintains mock-first defaults while allowing controlled testing of real provider integrations.

## What It Validates

### 1. Stripe Sandbox
- **Checkout Flow**: Tests Stripe checkout endpoint in sandbox mode
- **Webhook Echo**: Validates webhook handling without real signature verification
- **Mode Detection**: Verifies correct mocked/sandbox/test mode flags
- **Health Check**: Ensures backend is operational before testing

### 2. Email/Notify Sandbox
- **Send Endpoint**: Tests email/notify send functionality
- **Outbox Validation**: Confirms messages written to file-based outbox
- **Mode Switching**: Validates mock vs sandbox mode behavior
- **Path Tracking**: Verifies outbox file creation and paths

### 3. Shadow-Mode (Optional)
- **Parallel Calls**: Invokes sandbox APIs alongside mocks (log-only)
- **Flag Control**: Enabled via `FEATURE_SHADOW_CALLS=1`
- **Safety**: Mock remains source of truth, sandbox for validation only

## Feature Flags System

### Provider Flags (`backend/addons/provider_flags.py`)

Centralized feature flag management:

```python
class Flags:
    STRIPE_MOCK = as_bool("STRIPE_MOCK", True)      # Default: mocked
    STRIPE_TEST = as_bool("STRIPE_TEST", False)     # Sandbox mode
    NOTIFY_MODE = os.getenv("NOTIFY_MODE", "mock")  # mock | sandbox | live
    FEATURE_SHADOW_CALLS = as_bool("FEATURE_SHADOW_CALLS", False)
```

### Flag Behavior

| Flag | Default | Purpose | Safe for Prod |
|------|---------|---------|---------------|
| `STRIPE_MOCK` | `1` | Mock all Stripe calls | ✅ Yes |
| `STRIPE_TEST` | `0` | Enable Stripe test/sandbox mode | ✅ Yes (no charges) |
| `NOTIFY_MODE` | `mock` | Email provider mode | ✅ Yes (file outbox) |
| `FEATURE_SHADOW_CALLS` | `0` | Parallel sandbox validation | ⚠️ UAT only |

## Backend Extensions

### 1. Stripe Sandbox Adapter (`stripe_live_ext.py`)

**Endpoints:**
- `POST /api/stripe_ext/checkout` - Create checkout session
- `POST /api/stripe_ext/webhook` - Process webhook events

**Behavior:**
- **Mocked**: Returns local success URL
- **Sandbox**: Returns sandbox.stripe.com URL
- **Response**: Includes mode flags (mocked, sandbox)

**Example Response:**
```json
{
  "url": "https://sandbox.stripe.com/checkout/session/test",
  "mode": "subscription",
  "sandbox": true,
  "mocked": false
}
```

### 2. Email/Notify Adapter (`notify_live_ext.py`)

**Endpoints:**
- `POST /api/notify_ext/send` - Send email/notification

**Behavior:**
- Always writes to file outbox: `qa/notify/outbox/`
- **Mock mode**: File only, no external calls
- **Sandbox mode**: File + stub for real provider integration
- **Live mode**: Wire to real provider (Resend, SendGrid, etc.)

**Example Request:**
```json
{
  "to": "user@example.com",
  "template": "welcome",
  "subject": "Welcome!",
  "data": {"name": "John"}
}
```

**Example Response:**
```json
{
  "ok": true,
  "mode": "welcome",
  "sandbox": true,
  "mocked": false,
  "path": "qa/notify/outbox/1697123456_welcome.json"
}
```

## Environment Variables

| Variable | Description | Default | Stage 6 Mode |
|----------|-------------|---------|--------------|
| `OI_BASE_URL` | API base URL | `http://127.0.0.1:8000` | Set for tests |
| `STRIPE_MOCK` | Mock Stripe calls | `1` | `0` for sandbox |
| `STRIPE_TEST` | Stripe test mode | `0` | `1` for sandbox |
| `NOTIFY_MODE` | Email provider mode | `mock` | `sandbox` |
| `FEATURE_SHADOW_CALLS` | Shadow-mode validation | `0` | `1` for UAT |

## Usage

### Local Development

**1. Start backend:**
```bash
bash scripts/serve_api.sh
```

**2. Run Stage 6 (sandbox mode):**
```bash
export OI_BASE_URL="http://127.0.0.1:8000"
export STRIPE_MOCK=0
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
PYTHONPATH=. python stage6/run_stage6.py
```

**3. Run Stage 6 (shadow mode):**
```bash
export OI_BASE_URL="http://127.0.0.1:8000"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
export FEATURE_SHADOW_CALLS=1
PYTHONPATH=. python stage6/run_stage6.py
```

### Production/Staging

**Sandbox validation:**
```bash
export OI_BASE_URL="https://staging.yourapp.com"
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
PYTHONPATH=. python stage6/run_stage6.py
```

### Via Release Gate

```bash
# Runs all gates including Stage 6
PYTHONPATH=. python release_gate/run_all.py
```

## File Structure

```
stage6/
├── run_stage6.py                    # Main orchestrator
├── tests_api/
│   ├── __init__.py
│   ├── stripe_sandbox_test.py       # Stripe sandbox smoke test
│   └── notify_sandbox_test.py       # Notify sandbox smoke test
└── README.md                        # This file

backend/addons/
├── provider_flags.py                # Feature flags system
├── stripe_live_ext.py               # Stripe sandbox adapter
└── notify_live_ext.py               # Email/notify sandbox adapter

public/
└── stage6_status.html               # Status dashboard

qa/stage6/v0.6.0/
├── tests.json                       # Machine-readable results
└── tests.txt                        # Human-readable results

qa/notify/outbox/
└── [timestamp]_[template].json      # Email outbox files

scripts/
├── apply_stage6_gate_patch.py       # Release gate integration
└── update_test2_index_stage6.py     # Infrastructure tracking

ci/snippets/
└── stage6_gate.yml                  # GitHub Actions workflow

README_STAGE6.md                     # Quick reference
```

## Results Format

### tests.json

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

## Pass Criteria

**Stage 6 passes when:**

1. ✅ **Stripe Sandbox**: Checkout endpoint responds with valid URL
2. ✅ **Stripe Webhook**: Webhook echo returns ok status
3. ✅ **Notify Send**: Email endpoint responds successfully
4. ✅ **Outbox**: Email files written to qa/notify/outbox/

**Optional (advisory):**
- Shadow-mode calls (logged but don't affect pass/fail)
- Health check (if enabled via environment)

## Smoke Tests

### Stripe Sandbox Test

**What it tests:**
1. Health endpoint reachable
2. Checkout endpoint responds
3. Response includes URL
4. Webhook echo succeeds

**File:** `stage6/tests_api/stripe_sandbox_test.py`

**Safe by design:**
- No real Stripe API calls
- Sandbox URLs only
- Test mode enforced

### Notify Sandbox Test

**What it tests:**
1. Send endpoint responds
2. Response includes ok status
3. Outbox file created
4. Path returned in response

**File:** `stage6/tests_api/notify_sandbox_test.py`

**Safe by design:**
- File-based outbox only
- No external email delivery
- Sandbox stub for future integration

## Release Gate Integration

### Apply Integration

```bash
python scripts/apply_stage6_gate_patch.py
```

**What it does:**
- Modifies `release_gate/run_all.py`
- Adds Stage 6 to PACKS list
- Creates backup at `.bak_stage6`
- Preserves existing functionality

### Run Complete Pipeline

```bash
# All gates: Packs 1-9, Bundles A/B/C, Stages 2-6
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
8. Stage 5 (UAT)
9. **Stage 6 (Provider Sandbox)** ✨

## CI/CD Integration

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
      - run: pip install -r bundle_a/requirements.txt
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

## Status Dashboard

**Access:** `/stage6_status.html`

**Features:**
- Current feature flag values (from localStorage)
- Usage instructions
- Artifact paths
- CSP secured

**Update flags:**
```javascript
// In browser console
localStorage.setItem('STRIPE_TEST', '1');
localStorage.setItem('NOTIFY_MODE', 'sandbox');
```

## Troubleshooting

### Health Check Failing

**Problem:** Cannot reach backend

**Debug:**
```bash
# Test manually
curl http://127.0.0.1:8000/health

# Start backend
bash scripts/serve_api.sh
```

### Stripe Sandbox Test Failing

**Problem:** Checkout endpoint not responding

**Check:**
1. Backend running with Stage 6 extensions
2. `STRIPE_TEST=1` environment set
3. Routes registered in main.py

**Verify:**
```bash
curl -X POST http://127.0.0.1:8000/api/stripe_ext/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","email":"test@example.com"}'
```

### Notify Outbox Not Created

**Problem:** No files in qa/notify/outbox/

**Check:**
1. Directory created: `mkdir -p qa/notify/outbox`
2. `NOTIFY_MODE=sandbox` environment set
3. Permissions allow file writing

**Manual test:**
```bash
curl -X POST http://127.0.0.1:8000/api/notify_ext/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","template":"test","subject":"Test"}'

ls -la qa/notify/outbox/
```

### Shadow-Mode Not Logging

**Problem:** Shadow calls not visible

**Enable:**
```bash
export FEATURE_SHADOW_CALLS=1
PYTHONPATH=. python stage6/run_stage6.py
```

**Note:** Shadow-mode is advisory only - check application logs for shadow call results.

## Best Practices

### Development Workflow

**1. Start with mocks (default):**
```bash
# No env vars needed - mock-first!
PYTHONPATH=. python stage6/run_stage6.py
```

**2. Enable sandbox for testing:**
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
# Run full app and Stage 6 validation
```

**4. Production with live providers:**
```bash
export STRIPE_MOCK=0
export NOTIFY_MODE=live
# Wire real provider SDKs in notify_live_ext.py
```

### Safety Checklist

Before enabling sandbox/live:

- [ ] Confirm test/sandbox credentials configured
- [ ] Verify no real charges in Stripe test mode
- [ ] Check email provider limits (sandbox)
- [ ] Review outbox file permissions
- [ ] Test with small data sets first
- [ ] Monitor provider API quotas

## Integration with Quality System

Stage 6 completes the **8-gate quality pipeline**:

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

## Success Criteria

**Stage 6 is successful when:**

- [x] Provider flags system deployed
- [x] Stripe sandbox adapter functional
- [x] Email/notify sandbox adapter functional
- [x] Smoke tests passing
- [x] Outbox files created
- [x] Artifacts saved correctly
- [x] Gate integration complete

---

*Stage 6 Version: v0.6.0*  
*Status: Ready for Provider Testing*
