OPENINTERVIEW — SUBSCRIPTION QA PACK (Stripe-Managed Payments)

What this does
- Tests Subscription page with NO card storage (UI shows only brand + last4).
- Contract-driven DOM checks, behavior flows, a11y, security (CSP + no PAN), visual baselines, responsive.
- Appends a new row to test2.html (Subscription section) with links to page/code/tests.

Install (Replit)
1) Unzip this bundle at repo root.
2) Install deps:
   pip install -r subscription_pack/requirements.txt
   python -m playwright install --with-deps chromium

Run
# If preview host differs from http://127.0.0.1:8000:
# export OI_BASE_URL="https://<replit-preview-domain>"
python subscription_pack/run.py

Artifacts
- qa/subscription/v0.1.0/*
- subscription.html.txt (page snapshot)
- visual baselines: plans-default.png, success-default.png, canceled-default.png
- test2.html auto-updated in the Subscription section

Notes
- This pack uses a mock redirect for plan selection and cancel flows. In production, replace with real Stripe Checkout + Portal.
- Security test enforces: CSP present; no raw card numbers (PAN) in page; payment method displayed as brand + last4 only.