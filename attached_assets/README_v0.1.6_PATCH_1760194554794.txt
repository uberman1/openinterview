OPENINTERVIEW — PASSWORD RESET v0.1.6 PATCH

Adds:
1) Visual baseline for the success page (/password/success.html).
2) Shared E2E state flag written on Behavior PASS (qa/_state/session.json):
   { "security": { "reset": true, "timestamp": "<UTC ISO8601>" } }

Files modified:
- password_pack/contract.yml (version: v0.1.6 + success baseline)
- password_pack/tests_visual.py (per-baseline 'url' support)
- password_pack/tests_behavior.py (writes shared state on PASS)

Apply on Replit
1) Unzip at repo root (overwrite files above).
2) Ensure deps:
   pip install -r password_pack/requirements.txt
   python -m playwright install --with-deps chromium
3) Run:
   # export OI_BASE_URL="https://<replit-preview-domain>"  # if needed
   python password_pack/run.py

Outputs
- New artifacts: qa/password/v0.1.6/*
- Visual baselines (first run may WARN for success-default)
- Shared state: qa/_state/session.json (used by E2E flows)
- test2.html: new Password row for v0.1.6