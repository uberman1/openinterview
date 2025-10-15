# Bundle B — Core User Flows (Mock Data)
Modules included:
- Module 4: Video Upload (Mock)
- Module 5: Share Links (Mock Tokens)

This bundle is optimized for Replit limits: one runner, one utils folder, flat tests directory. Hash routes are used (/#/...).

Install once in Replit:
  npm i
  npx playwright install --with-deps
  cp .env.example .env  # set BASE_URL to your preview URL

Run a single module:
  MODULE=module4 npm run journey
  MODULE=module5 npm run journey

Run both modules:
  npm run journey:all

Logs:
  logs/journey-log-<MODULE>-YYYYMMDD-HHMMSS.ndjson
Screenshots:
  artifacts/screenshots/<MODULE>/*.png

==================================================
Module 4 — Video Upload (Mock)
==================================================
Goal
- Provide a mock upload experience at /#/upload.
- "Uploads" are stored in localStorage and listed on the page.

Guardrail Prompt — Do not proceed to Module 5 until ALL are true
1) /#/upload renders a visible upload UI (file input + list).
2) Selecting files adds entries to the list.
3) The list persists after a full reload (localStorage).
4) Automated journey passes:
   MODULE=module4 npm run journey
   → Log shows suite_complete with no pageerror; screenshot of /#/upload shows non-empty list after manual upload in human QA.
5) Human QA steps pass:
   - Open /#/upload, select 2–3 small files.
   - Refresh; confirm list still shows the files.
   - Confirm no repeating console errors.

Optional stub provided: src/pages/UploadMock.jsx

==================================================
Module 5 — Share Links (Mock Tokens)
==================================================
Goal
- Generate mock share links for uploaded items.
- View mock shared item at /#/s/:token without auth.

Guardrail Prompt — Do not proceed to Module C (Supabase) until ALL are true
1) Each uploaded item can generate a unique share token.
2) Copying the token URL (/#/s/<token>) and opening it shows a non-empty mock share view.
3) Share links persist in localStorage (token to item mapping).
4) Automated journey passes:
   MODULE=module5 npm run journey
   → Route /#/s/testtoken renders a non-fatal page (used as smoke). Real token flow verified via human QA.
5) Human QA steps pass:
   - On /#/upload, click "Generate Share Link" for one item.
   - Open the copied /#/s/<token> in a new/incognito window.
   - Confirm a non-empty mock share page renders.

Optional stub provided: src/pages/ShareMock.jsx

Notes
- These modules do NOT touch your backend. They simulate UX only.
- Real integrations happen in Bundle C (Supabase).
