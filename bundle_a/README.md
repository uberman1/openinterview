# Bundle A v0.2.0 — API-only Test Runner

This directory contains **requests-based HTTP checks** (no browser) for Bundle A security, Stripe, and notification tests. This approach avoids the Replit environment constraint where Playwright/Chromium processes interfere with background FastAPI servers.

## Quick Start

### 1. Start Backend (in separate terminal/tab)
```bash
bash scripts/start_backend_foreground.sh
```
Or manually:
```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Run Tests (in another terminal)
```bash
# Run all Bundle A tests
PYTHONPATH=. python bundle_a/run_bundle_a_tests.py

# Run individual test modules
PYTHONPATH=. python bundle_a/tests_api/security_test.py
PYTHONPATH=. python bundle_a/tests_api/stripe_test.py
PYTHONPATH=. python bundle_a/tests_api/notify_test.py
```

### 3. Run via Release Gate
```bash
# Ensure backend is running first, then:
PYTHONPATH=. python release_gate/patch_run_all.py
```

## Environment Variables

Configure in `backend/.env` or export:

- `BUNDLE_A_BASE` - API base URL (default: `http://127.0.0.1:8000`)
- `STRIPE_SIGNING_SECRET` - Stripe webhook secret (default: `whsec_dev`)

## Test Coverage

### Security Extension (`tests_api/security_test.py`)
- ✅ CSRF token generation with HMAC-SHA256 signature
- ✅ Rate limiting (5 requests per 60 second window)
- ✅ Session touch/refresh endpoint

### Stripe Live Extension (`tests_api/stripe_test.py`)
- ✅ Webhook signature verification (valid signature)
- ✅ Webhook signature rejection (invalid signature)

### Notify Provider (`tests_api/notify_test.py`)
- ✅ OTP email sending via mock provider
- ✅ Generic email sending via mock provider

## Output Format

All tests output JSON with PASS/FAIL status:

```json
{
  "auth_hardening_v0_2_0": {
    "csrf": "PASS",
    "rate_limit": "PASS",
    "session_touch": "PASS"
  },
  "stripe_live_ready_v0_2_0": {
    "webhook_sig_ok": "PASS",
    "webhook_sig_bad": "PASS"
  },
  "notify_provider_ready_v0_2_0": {
    "otp": "PASS",
    "generic": "PASS"
  }
}
```

Exit code: `0` = all pass, `1` = failures detected

## Replit Environment Notes

The Replit environment has process management constraints. Background processes started with `nohup` or `&` may terminate unexpectedly. To work around this:

1. **Manual Testing**: Start backend in a dedicated terminal/workflow
2. **CI/CD**: Use external runners without these constraints
3. **Alternative**: Integrate tests into existing Playwright packs that manage their own backend lifecycle

## Architecture

```
bundle_a/
├── tests_api/
│   ├── __init__.py
│   ├── security_test.py    # Security extension tests
│   ├── stripe_test.py      # Stripe webhook tests
│   └── notify_test.py      # Notify provider tests
├── run_bundle_a_tests.py   # Main test runner
└── README.md               # This file
```

Each test module can run independently and exports a `run()` function that returns test results.
