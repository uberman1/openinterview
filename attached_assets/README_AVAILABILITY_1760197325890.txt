OPENINTERVIEW — AVAILABILITY QA PACK

What this does
- Contract-driven DOM checks, behavior flows, a11y, security (CSP + no email PII), visual baselines, responsive.
- Auto-updates test2.html (Availability section).
- Behavior enforces prerequisite: subscription must be active via qa/_state/session.json.

Install (Replit)
1) Unzip at repo root.
2) Deps:
   pip install -r availability_pack/requirements.txt
   python -m playwright install --with-deps chromium

Run
# export OI_BASE_URL="https://<replit-preview-domain>"  # if needed
python availability_pack/run.py
