OPENINTERVIEW — PROFILES QA PACK

Goal
Catch the 'profiles table disappears after load' regression and validate core CRUD-ish flows.

What this tests
- Contract: key DOM nodes (table + container + form + live regions)
- Behavior: 
  - PF-LIST-VISIBLE-AFTER-LOAD (ensures table remains visible after hydration)
  - PF-CREATE-SAVE-PUBLISH (form save + publish status)
  - PF-NO-DISAPPEAR-POST-HYDRATE (extra guard 800ms after render)
  - Console errors captured
  - Responsive presence (mobile/desktop)
- A11y: landmarks and live regions
- Security: meta CSP, no token/email leaks
- Visual: baseline on main content

Install (Replit)
1) Unzip at repo root.
2) Deps:
   pip install -r profiles_pack/requirements.txt
   python -m playwright install --with-deps chromium

Run
# export OI_BASE_URL="https://<replit-preview-domain>"  # if needed
python profiles_pack/run.py
