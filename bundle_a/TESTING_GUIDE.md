# Bundle A v0.2.0 Testing Guide

## Overview

Bundle A introduces production-ready security, payment, and notification adapters with comprehensive API testing. Due to Replit environment constraints, automated background process management isn't fully supported, so we've implemented a **requests-based HTTP testing approach** that works reliably.

## Test Suite Architecture

```
bundle_a/
├── tests_api/
│   ├── security_test.py    # CSRF, rate limiting, session tests
│   ├── stripe_test.py      # Webhook signature verification  
│   └── notify_test.py      # Email provider tests
├── run_bundle_a_tests.py   # Main test orchestrator
└── README.md               # Quick reference
```

## Running Tests: Step-by-Step

### Prerequisites

1. **Backend configured** with Bundle A environment variables in `backend/.env`:
   ```bash
   AUTH_RATE_LIMIT=5
   AUTH_RATE_WINDOW_SEC=60
   SESSION_TTL_SEC=1800
   CSRF_SECRET=dev-csrf-secret-change-in-production
   STRIPE_TEST=1
   STRIPE_SIGNING_SECRET=whsec_dev
   NOTIFY_MODE=mock
   ```

2. **Dependencies installed**:
   ```bash
   # Already completed via packager
   # requests==2.32.3
   # itsdangerous==2.2.0
   ```

### Method 1: Automated API Tests (Recommended)

**Terminal 1 - Start Backend:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 - Run Tests:**
```bash
# Full Bundle A suite
PYTHONPATH=. python bundle_a/run_bundle_a_tests.py

# Individual modules
PYTHONPATH=. python bundle_a/tests_api/security_test.py
PYTHONPATH=. python bundle_a/tests_api/stripe_test.py
PYTHONPATH=. python bundle_a/tests_api/notify_test.py
```

**Expected Output:**
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

### Method 2: Manual cURL Verification

**Start backend first:**
```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

**Security Extension Tests:**
```bash
# 1. CSRF Token Generation
curl http://localhost:8000/api/security/csrf
# Expected: {"csrf":"1760226449.66012004d269a23d9b7fc5581a41aeb54daf7e973b60f08f740efbee2f5b4b72"}

# 2. Rate Limiting (run 6 times)
for i in {1..6}; do 
  echo "Request $i:"
  curl -w "\nStatus: %{http_code}\n" http://localhost:8000/api/security/rate_check
done
# Expected: First 5 return 200, 6th returns 429

# 3. Session Touch
curl -X POST http://localhost:8000/api/security/touch
# Expected: {"ok":true,"touched":1760226500}
```

**Stripe Extension Tests:**
```bash
# 1. Checkout Session
curl -X POST http://localhost:8000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","email":"test@example.com"}'
# Expected: {"ok":true,"url":"/subscription/success.html?plan=pro"}

# 2. Webhook Signature Verification (Python helper)
python3 << 'EOF'
import hmac, hashlib, json, time, subprocess
secret = "whsec_dev"
payload = {"type":"checkout.session.completed","data":{"object":{"plan":"pro"}}}
ts = str(int(time.time()))
raw = ts + "." + json.dumps(payload, separators=(",", ":"), sort_keys=True)
v1 = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
sig_header = f"t={ts},v1={v1}"

# Valid signature
subprocess.run([
    "curl", "-X", "POST", "http://localhost:8000/api/stripe/webhook",
    "-H", f"stripe-signature: {sig_header}",
    "-H", "content-type: text/plain",
    "-d", raw
])
print("\n\nInvalid signature test:")
# Invalid signature  
subprocess.run([
    "curl", "-w", "\nStatus: %{http_code}\n",
    "-X", "POST", "http://localhost:8000/api/stripe/webhook",
    "-H", "stripe-signature: t=0,v1=invalid",
    "-H", "content-type: text/plain", 
    "-d", raw
])
EOF
```

**Notify Provider Tests:**
```bash
# 1. OTP Email
curl -X POST http://localhost:8000/api/notify/otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
# Expected: {"ok":true}

# 2. Generic Email
curl -X POST http://localhost:8000/api/notify/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","template":"generic","subject":"Test","variables":{}}'
# Expected: {"ok":true}

# 3. Check Outbox
ls -la qa/notify/outbox/
cat qa/notify/outbox/*.json | jq
```

## Troubleshooting

### Backend Won't Start
```bash
# Check if port 8000 is in use
lsof -i :8000
# Kill existing processes
pkill -f "uvicorn main:app"

# Check backend imports
cd backend && python -c "import main"
```

### Tests Fail with Connection Refused
- Ensure backend is running: `curl http://localhost:8000/health`
- Check `BUNDLE_A_BASE` environment variable (default: `http://127.0.0.1:8000`)
- Verify no firewall blocking port 8000

### Rate Limit Tests Inconsistent
- Rate limit state persists across test runs
- Wait 60 seconds between test executions
- Or restart backend to reset rate limit counters

## CI/CD Integration

For automated testing in GitHub Actions, GitLab CI, or other platforms:

```yaml
# Example GitHub Actions
- name: Start Backend
  run: |
    cd backend
    uvicorn main:app --host 0.0.0.0 --port 8000 &
    sleep 5
    curl http://localhost:8000/health

- name: Run Bundle A Tests  
  run: |
    PYTHONPATH=. python bundle_a/run_bundle_a_tests.py
```

## Test Coverage Summary

| Component | Endpoint | Test Cases | Status |
|-----------|----------|-----------|--------|
| Security  | GET /api/security/csrf | Token format, signature validity | ✅ |
| Security  | GET /api/security/rate_check | 5 req/60s limit enforcement | ✅ |
| Security  | POST /api/security/touch | Session refresh, timestamp update | ✅ |
| Stripe    | POST /api/stripe/webhook | Valid signature acceptance | ✅ |
| Stripe    | POST /api/stripe/webhook | Invalid signature rejection (400) | ✅ |
| Notify    | POST /api/notify/otp | OTP email template | ✅ |
| Notify    | POST /api/notify/send | Generic email template | ✅ |

## Next Steps

1. **Production Deployment**: Update environment variables for live secrets
2. **Monitoring**: Add logging/metrics for security events and webhook processing
3. **External CI**: Set up automated testing in GitHub Actions or similar
4. **Load Testing**: Validate rate limiting under concurrent load
5. **Provider Integration**: Replace mock notify provider with Resend/SendGrid
