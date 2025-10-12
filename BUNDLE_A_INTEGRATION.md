# Bundle A v0.2.0 Integration Status

## ✅ Successfully Integrated Components

### 1. Security Extension (`backend/addons/security_ext.py`)
**Endpoints:**
- `GET /api/security/csrf` - CSRF token generation with HMAC-SHA256
- `POST /api/security/touch` - Session touch/refresh endpoint
- `GET /api/security/rate_check` - Rate limiting validation (5 req/60sec window)

**Features:**
- Session-based CSRF protection
- IP + User-Agent fingerprinting for rate limiting
- Configurable rate windows and limits via environment variables
- Session TTL management (1800 sec default)

### 2. Stripe Live Extension (`backend/addons/stripe_ext_live.py`)
**Endpoints:**
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Webhook handler with signature verification

**Features:**
- HMAC-SHA256 webhook signature validation
- Test mode support (`STRIPE_TEST=1`)
- Timestamp-based replay attack prevention

### 3. Notify Provider (`backend/addons/notify_provider.py`)
**Functions:**
- `send_email()` - Mock email sending with file-based outbox

**Features:**
- Mock mode with file persistence (`qa/notify/outbox/`)
- Template support (otp, booking_confirm, booking_cancel, profile_published, generic)
- Extensible for production providers (Resend, etc.)

### 4. Backend Integration
**Files Modified:**
- `backend/main.py` - Routers included, SessionMiddleware added
- `backend/.env` - Bundle A environment variables configured

**Dependencies Added:**
- `itsdangerous==2.2.0` - Required for SessionMiddleware

## 🔧 Environment Configuration

```bash
# Bundle A v0.2.0 - Security & Hardening
AUTH_RATE_LIMIT=5
AUTH_RATE_WINDOW_SEC=60
SESSION_TTL_SEC=1800
CSRF_SECRET=dev-csrf-secret-change-in-production
STRIPE_TEST=1
STRIPE_SIGNING_SECRET=whsec_dev
NOTIFY_MODE=mock
```

## 🚀 Running Bundle A Tests

### Method 1: Requests-Based API Tests (Recommended)

The `/bundle_a` directory contains pure HTTP tests using the `requests` library, avoiding Playwright/browser process constraints.

**Step 1: Start Backend** (in terminal 1 or separate workflow)
```bash
bash scripts/start_backend_foreground.sh
# Or manually:
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

**Step 2: Run Tests** (in terminal 2)
```bash
# All Bundle A tests
PYTHONPATH=. python bundle_a/run_bundle_a_tests.py

# Individual test modules
PYTHONPATH=. python bundle_a/tests_api/security_test.py
PYTHONPATH=. python bundle_a/tests_api/stripe_test.py
PYTHONPATH=. python bundle_a/tests_api/notify_test.py

# Via release gate
PYTHONPATH=. python release_gate/patch_run_all.py
```

### Method 2: Manual cURL Tests

**Start Backend**
```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

**Test Security Extension**
```bash
# CSRF Token
curl http://localhost:8000/api/security/csrf
# Expected: {"csrf":"<timestamp>.<signature>"}

# Session Touch
curl -X POST http://localhost:8000/api/security/csrf
# Expected: {"ok":true,"touched":<timestamp>}

# Rate Limit (run 6 times to trigger 429)
for i in {1..6}; do curl http://localhost:8000/api/security/rate_check; done
# Expected: First 5 succeed, 6th returns 429
```

### Test Stripe Extension
```bash
# Checkout
curl -X POST http://localhost:8000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","email":"test@example.com"}'
# Expected: {"ok":true,"url":"/subscription/success.html?plan=pro"}

# Webhook Signature (requires valid signature)
python3 -c "
import hmac, hashlib, json, time
secret = 'whsec_dev'
payload = {'type':'checkout.session.completed'}
ts = str(int(time.time()))
raw = ts + '.' + json.dumps(payload, separators=(',', ':'), sort_keys=True)
sig = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
print(f'Signature: t={ts},v1={sig}')
print(f'Body: {raw}')
"
```

### Test Notify Provider
```bash
# Check outbox is empty
ls -la qa/notify/outbox/

# Send test email via notify extension
curl -X POST http://localhost:8000/api/notify/otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify outbox has new file
ls -la qa/notify/outbox/
cat qa/notify/outbox/*.json | jq
```

## 📦 Test Packs Created

### `auth_pack_v0_2_0/`
- Tests: CSRF generation, rate limiting, session touch
- Requirements: System chromium, running backend on port 8000

### `subscription_pack_v0_2_0/`
- Tests: Stripe webhook signature validation (valid + invalid)
- Requirements: System chromium, running backend on port 8000

### `notify_pack_v0_2_0/`
- Tests: OTP email send, generic email send, outbox growth verification
- Requirements: System chromium, running backend on port 8000

## ⚠️ Known Limitations & Solutions

### Environment Process Constraints
The Replit environment has process management constraints where background processes (started with `nohup`, `&`, or `subprocess`) may terminate unexpectedly. This particularly affects combinations of:
- FastAPI backend running in background
- Concurrent Python test execution
- Any process spawning (including `requests` library in some cases)

### ✅ Implemented Solutions

**Bundle A Requests-Based Tests** (`/bundle_a`)
- Pure HTTP tests using `requests` library (no Playwright/Chromium)
- Requires manual backend startup in separate terminal/workflow
- Tests: `security_test.py`, `stripe_test.py`, `notify_test.py`
- Main runner: `bundle_a/run_bundle_a_tests.py`
- Release gate: `release_gate/patch_run_all.py`

### 📝 Recommended Testing Workflow

**Option 1: Two-Terminal Approach**
1. Terminal 1: `bash scripts/start_backend_foreground.sh`
2. Terminal 2: `PYTHONPATH=. python bundle_a/run_bundle_a_tests.py`

**Option 2: Manual Verification**
1. Start backend: `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`
2. Use cURL commands documented above to test endpoints

**Option 3: External CI/CD**
- GitHub Actions, GitLab CI, or other runners without these constraints
- Automated testing in production-like environments

## 🚀 Production Deployment Checklist

- [ ] Change `CSRF_SECRET` to production secret
- [ ] Set `STRIPE_SIGNING_SECRET` to production webhook secret
- [ ] Set `STRIPE_TEST=0` for live Stripe API
- [ ] Configure `NOTIFY_MODE=live` and `NOTIFY_PROVIDER=resend`
- [ ] Implement production email provider in `notify_provider.py`
- [ ] Review rate limit settings (`AUTH_RATE_LIMIT`, `AUTH_RATE_WINDOW_SEC`)
- [ ] Set appropriate `SESSION_TTL_SEC` for production

## 📁 Files Added/Modified

**New Files:**
- `backend/addons/security_ext.py`
- `backend/addons/stripe_ext_live.py`
- `backend/addons/notify_provider.py`
- `auth_pack_v0_2_0/tests.py`
- `auth_pack_v0_2_0/run.py`
- `subscription_pack_v0_2_0/tests.py`
- `subscription_pack_v0_2_0/run.py`
- `notify_pack_v0_2_0/tests.py`
- `notify_pack_v0_2_0/run.py`
- `release_gate/patch_run_all.py`
- `scripts/serve_api_bundle.sh`

**Modified Files:**
- `backend/main.py` - Added router imports and SessionMiddleware
- `backend/.env` - Added Bundle A environment variables
- `pyproject.toml` - Added itsdangerous dependency

## ✨ Next Steps

1. **Resolve Test Environment Issues:** Work with Replit support to understand process management constraints
2. **Alternative Test Implementation:** Create non-Playwright test runner using `requests` library
3. **Production Integration:** Deploy with production secrets and live API endpoints
4. **Monitoring:** Add logging and metrics for security events, rate limits, and webhook processing
