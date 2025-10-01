# Module 5 — Selftest Merge & UI Hook

This patch unifies Module 05 checks into the main `scripts/selftest.js` and provides a tiny optional client patch to surface the upload widget.

What’s included
- `scripts/selftest.js` — drop-in replacement that supports Modules 00–06 (adds Module 05 checks inline).
- `client/patches/ProfileUpload.hint.txt` — one-liner snippet to render the upload widget on your Profile page(s) without altering your layout.

How to apply
1) Replace your `/scripts/selftest.js` with the one in this archive.
2) (Optional) Open your Profile page component(s) and paste the hint where appropriate.
3) Run:
   npm run build
   MODULE_NUM=05 node scripts/selftest.js

Expected
- Writes `logs/selftest.mod-05.json` and `logs/mod-05.log`.
- Prints ALL CHECKS PASSED when uploads are working.
