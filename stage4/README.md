# Stage 4 — Production Go-Live Readiness (v0.4.0)

## Overview

Stage 4 is the **final quality gate** before production deployment. It validates your application against a real environment URL (staging or production) with comprehensive checks for health, performance, security headers, and provider configuration.

## What It Validates

### 1. Health Contract
- **Endpoint**: `/health`
- **Expected Response**: HTTP 200 with JSON:
  - `{"status": "ok"}` OR
  - `{"healthy": true}` OR
  - `{"ok": true}`
- **Captures**: Response latency in milliseconds

### 2. Canary Pings
- **Count**: 5 consecutive requests
- **Delay**: 300ms between requests
- **Metrics**: 
  - Success rate (must be 5/5)
  - p95 latency (must be < 1000ms)
  - Individual sample latencies
- **SLO**: p95 latency budget = 1000ms

### 3. Root Headers
- **Endpoint**: Base URL (`/`)
- **Security Check**: Content-Security-Policy (CSP) header
- **Expected**: CSP header present (either `Content-Security-Policy` or `Content-Security-Policy-Report-Only`)

### 4. Provider Configuration
- **Stripe**:
  - Mode check (test vs live)
  - Webhook signing secret presence
- **Email/Notifications**:
  - Provider mode (mock vs real)
  - EMAIL_FROM configuration
- **Validation Level**: Advisory by default, enforced when `EXPECT_LIVE=1`

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PROD_URL` | Base URL for target environment | `http://127.0.0.1:8000` | No |
| `STAGE_URL` | Alternative to PROD_URL | - | No |
| `HEALTH_URL` | Health endpoint URL | `{PROD_URL}/health` | No |
| `S4_TIMEOUT` | Request timeout in seconds | `5.0` | No |
| `EXPECT_LIVE` | Require live providers | `0` | No |
| `ALLOW_PROVIDER_MOCK` | Allow mock providers | `1` | No |

## Usage

### Local/Development Testing

**1. Start your backend:**
```bash
# Ensure backend is running
curl http://127.0.0.1:8000/health
```

**2. Run Stage 4:**
```bash
export PROD_URL="http://127.0.0.1:8000"
export HEALTH_URL="$PROD_URL/health"
export EXPECT_LIVE=0
export ALLOW_PROVIDER_MOCK=1

PYTHONPATH=. python stage4/run_stage4.py
```

### Staging Environment

```bash
export PROD_URL="https://staging.yourapp.com"
export HEALTH_URL="$PROD_URL/health"
export EXPECT_LIVE=0
export ALLOW_PROVIDER_MOCK=1

PYTHONPATH=. python stage4/run_stage4.py
```

### Production Validation

```bash
export PROD_URL="https://yourapp.com"
export HEALTH_URL="$PROD_URL/health"
export EXPECT_LIVE=1          # Enforce live providers
export ALLOW_PROVIDER_MOCK=0  # No mock providers allowed

PYTHONPATH=. python stage4/run_stage4.py
```

## File Structure

```
stage4/
├── run_stage4.py            # Main orchestrator
├── requirements.txt         # Python dependencies
└── README.md                # This file

qa/stage4/v0.4.0/
├── summary.json             # Machine-readable results
└── tests.txt                # Human-readable summary

scripts/
└── update_test2_index_stage4.py  # Infrastructure tracking

ci/snippets/
└── stage4_pipeline.yml      # GitHub Actions workflow

README_STAGE4.md             # Quick reference
STAGE4_COMPLETE.md           # Detailed summary
```

## Results Format

### summary.json

```json
{
  "stage": "Stage 4 – Production Go-Live Readiness",
  "timestamp": "2025-10-12T13:34:57Z",
  "base_url": "http://127.0.0.1:8000",
  "health_url": "http://127.0.0.1:8000/health",
  "checks": {
    "health": {
      "ok": true,
      "status_code": 200,
      "latency_ms": 45.23,
      "payload": {"status": "ok"}
    },
    "canary": {
      "oks": 5,
      "count": 5,
      "p95_ms": 52.15,
      "samples": [
        {"code": 200, "latency_ms": 48.5},
        {"code": 200, "latency_ms": 52.15}
      ]
    },
    "root_headers": {
      "ok": true,
      "status_code": 200,
      "csp_present": true,
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'"
    },
    "provider_config": {
      "STRIPE_MODE": "1",
      "STRIPE_SIGNING_SECRET_set": true,
      "NOTIFY_MODE": "mock",
      "EMAIL_FROM_set": false
    },
    "provider_issues": []
  },
  "status": "PASS"
}
```

## Pass Criteria

**Stage 4 passes when ALL of the following are true:**

1. ✅ **Health check**: Returns ok status with HTTP 200
2. ✅ **Canary success**: All 5 pings return HTTP 200
3. ✅ **Latency SLO**: p95 latency < 1000ms
4. ✅ **Provider config**: No issues OR `ALLOW_PROVIDER_MOCK=1`

**If any check fails**, the gate returns `FAIL` status.

## Provider Configuration Validation

### Development/Staging Mode
```bash
export EXPECT_LIVE=0
export ALLOW_PROVIDER_MOCK=1
```
- Allows mock providers
- Advisory warnings only
- Suitable for staging validation

### Production Mode
```bash
export EXPECT_LIVE=1
export ALLOW_PROVIDER_MOCK=0
```
- Enforces live providers
- **Required checks**:
  - `STRIPE_TEST=0` (live mode)
  - `STRIPE_SIGNING_SECRET` set
  - `NOTIFY_MODE=provider` (e.g., resend)
  - `EMAIL_FROM` configured

**Provider issues fail the gate** when `EXPECT_LIVE=1` and `ALLOW_PROVIDER_MOCK=0`.

## CI/CD Integration

### GitHub Actions

**Workflow Dispatch** (run against any URL):

```yaml
name: Stage 4 – Go-Live Readiness

on:
  workflow_dispatch:
    inputs:
      prod_url:
        description: "Base URL for production/staging"
        required: true
        default: "https://your-domain.example.com"

jobs:
  stage4:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      
      - name: Install deps
        run: pip install -r stage4/requirements.txt
      
      - name: Run Stage 4 Gate
        env:
          PROD_URL: ${{ github.event.inputs.prod_url }}
          HEALTH_URL: ${{ github.event.inputs.prod_url }}/health
          EXPECT_LIVE: "0"
          ALLOW_PROVIDER_MOCK: "1"
        run: PYTHONPATH=. python stage4/run_stage4.py
      
      - name: Update test index
        run: PYTHONPATH=. python scripts/update_test2_index_stage4.py || true
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: stage4-artifacts
          path: qa/stage4/v0.4.0/**
```

**Use:** `ci/snippets/stage4_pipeline.yml`

## Troubleshooting

### Health Check Failing

**Problem:** Health endpoint returns non-ok status

**Solution:**
```bash
# Test manually
curl -v http://127.0.0.1:8000/health

# Check response format
curl -s http://127.0.0.1:8000/health | python -m json.tool

# Ensure backend is running
ps aux | grep uvicorn
```

### Canary Latency Too High

**Problem:** p95 latency > 1000ms

**Solutions:**
- Check server resources (CPU, memory)
- Review database query performance
- Enable caching where appropriate
- Scale horizontally if needed

**Temporary override:**
```bash
# Adjust timeout if needed
export S4_TIMEOUT=10.0
```

### CSP Header Missing

**Problem:** Root headers check fails (no CSP)

**Solution:**
```python
# Add CSP header in your app
# Example for Express.js:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}))
```

### Provider Issues

**Problem:** Provider configuration warnings

**Development/Staging:**
```bash
# Allow mocks for testing
export ALLOW_PROVIDER_MOCK=1
export EXPECT_LIVE=0
```

**Production:**
```bash
# Configure real providers
export STRIPE_TEST=0
export STRIPE_SIGNING_SECRET="your_secret"
export NOTIFY_MODE="resend"
export EMAIL_FROM="noreply@yourapp.com"
```

## Infrastructure Tracking

**Auto-update test2.html:**
```bash
python scripts/update_test2_index_stage4.py
```

**Verify update:**
```bash
grep -A 10 "Stage 4" public/test2.html
```

The script creates a new section with:
- Version (v0.4.0)
- Description
- Links to home, code, and results

## Success Criteria

**Stage 4 is production-ready when:**

- [x] Health endpoint returns ok (200)
- [x] All 5 canary pings succeed (5/5)
- [x] p95 latency < 1000ms (SLO met)
- [x] CSP header present on root
- [x] Provider config valid OR mocks allowed
- [x] Artifacts saved to `qa/stage4/v0.4.0/`
- [x] Infrastructure tracking updated

## Integration with Quality System

Stage 4 completes the **6-stage quality pipeline**:

1. **Packs 1-9**: Feature validation (Playwright E2E)
2. **Bundle A**: API security (CSRF, Stripe, Email)
3. **Bundle B**: UI quality (A11y, Perf, Responsive)
4. **Bundle C**: Governance (Org, Audit, Metrics)
5. **Stage 2**: File protection (SHA-256 guardrails)
6. **Stage 3**: Staging pilot (API smoke tests)
7. **Stage 4**: Production readiness (Health, Canary, CSP, Providers) ✨

## Next Steps

After Stage 4 passes:

1. **Review artifacts** in `qa/stage4/v0.4.0/`
2. **Validate provider config** for production
3. **Configure monitoring** and alerting
4. **Plan deployment** strategy
5. **Execute go-live** with confidence

---

*Stage 4 Version: v0.4.0*  
*Status: Ready for production validation*
