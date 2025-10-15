# Bundle A v0.2.0 — API-only Runner Patch

This patch converts Bundle A tests to **requests-based HTTP checks** (no browser), so the FastAPI
server won't get terminated by Playwright on Replit.

## How to apply

1) Upload and unzip:
   ```bash
   unzip -o bundle_a_api_runner_v0_2_0.zip
   ```

2) Install requirements (one-time):
   ```bash
   pip install -r bundle_a/requirements.txt
   ```

3) Start your backend (existing command):
   ```bash
   bash scripts/serve_api.sh
   ```

4) Run Bundle A tests directly:
   ```bash
   PYTHONPATH=. python bundle_a/run_bundle_a_tests.py
   ```

5) Or run via release gate patch:
   ```bash
   PYTHONPATH=. python release_gate/patch_run_all.py
   ```

## Env (defaults)

- `BUNDLE_A_BASE=http://127.0.0.1:8000`
- `STRIPE_SIGNING_SECRET=whsec_dev`

## What the tests do

- **Security**: CSRF token, per-window rate limit, session touch ok
- **Stripe**: Webhook signature verification (good + bad)
- **Notify**: OTP and generic e-mail send via mock provider

All results are printed as JSON, and a non-zero exit code means failures were detected.
