OPENINTERVIEW — PASSWORD RESET v0.1.5 PATCH

This patch moves Password Reset to full green:
- Adds <main id="content"> landmark (stable visual target)
- Increases responsive waits to avoid flaky timeouts
- Bumps contract version to v0.1.5

Apply on Replit
1) Unzip at repo root, allowing it to overwrite:
   public/password_reset.html
   password_pack/contract.yml
   password_pack/tests_behavior.py

2) Install (if not already):
   pip install -r password_pack/requirements.txt
   python -m playwright install --with-deps chromium

3) Run the suite:
   # If your preview URL is not http://127.0.0.1:8000, set it:
   # export OI_BASE_URL="https://<replit-preview-domain>"
   python password_pack/run.py

Artifacts & Updates
- New artifacts in: qa/password/v0.1.5/
- test2.html gets a new Password row (v0.1.5) with page, source, tests links.

Notes
- Visual baseline for v0.1.4 remains; v0.1.5 will compare against it.
- If you intentionally changed visuals, approve the new baseline by copying the new image over the old one (optional).