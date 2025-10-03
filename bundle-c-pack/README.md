# Bundle C — Supabase Integration (Modules 6–9)

Modules
- Module 6: Supabase Auth
- Module 7: Supabase Storage (Videos)
- Module 8: Profiles & Public Pages
- Module 9: Real Share Links

This bundle adds real backend integration. It ships with:
- Per-module journey tests (hash routes) to validate flows.
- `.env.example` for Supabase credentials.
- `src/lib/supabaseClient.js` stub you can import in your app (optional).
- SQL templates in `db/` for tables and RLS policies.

Install (once)
  npm i
  npx playwright install --with-deps
  cp .env.example .env   # add SUPABASE_URL and SUPABASE_ANON_KEY

Run a single module
  MODULE=module6 npm run journey
  MODULE=module7 npm run journey
  MODULE=module8 npm run journey
  MODULE=module9 npm run journey

Run them all
  npm run journey:all

Logs
  logs/journey-log-<MODULE>-YYYYMMDD-HHMMSS.ndjson
Screenshots
  artifacts/screenshots/<MODULE>/*.png

==================================================
Module 6 — Supabase Auth
==================================================
Goal
- Replace fake login with real Supabase magic-link or password auth.

Guardrail Prompt — Do not proceed to Module 7 until ALL are true
1) /#/login renders a real auth form that calls Supabase.
2) Successful auth redirects to /#/dashboard and persists after refresh.
3) Logout clears session and redirects to /#/login.
4) Automated: MODULE=module6 npm run journey completes; human QA validates login.
Human QA
- Register or log in using Supabase auth (magic link or password).
- Reload to confirm session persistence.
- Logout, confirm redirect to /#/login.

==================================================
Module 7 — Supabase Storage (Videos)
==================================================
Goal
- Upload real files to Supabase Storage bucket `videos` and list them.

Guardrail Prompt — Do not proceed to Module 8 until ALL are true
1) /#/upload selects a file and successfully uploads (small mp4/webm recommended).
2) Upload appears in dashboard list and persists across reloads.
3) Journey: MODULE=module7 npm run journey completes; human QA confirms upload + list.
Human QA
- Upload a small test file, then refresh dashboard. Confirm listed.

==================================================
Module 8 — Profiles & Public Pages
==================================================
Goal
- Profile editor stores to `profiles` table; public profile page `/#/u/:username` is readable (respecting privacy flag).

Guardrail Prompt — Do not proceed to Module 9 until ALL are true
1) Editing profile updates DB row (owner only).
2) `/#/u/<username>` renders public read-only view when `is_public=true`.
3) When `is_public=false`, public view blocked (404/guarded).
4) Journey: MODULE=module8 npm run journey completes.
Human QA
- Set username and headline; open `/#/u/<username>` in incognito. Toggle public/private and re-check.

==================================================
Module 9 — Real Share Links
==================================================
Goal
- Create share tokens in `shares` table and render `/#/s/:token` with signed URL playback.

Guardrail Prompt — Before moving to Bundle D, confirm ALL are true
1) Generating a share produces a DB token mapped to a video.
2) Visiting `/#/s/<token>` loads a playable source (signed URL) without auth.
3) Expired/invalid token blocked.
4) Journey: MODULE=module9 npm run journey completes; human QA validates a real token.
