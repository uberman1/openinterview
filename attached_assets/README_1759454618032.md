# Module 3 Pack — Dashboard & Profile (Mock Data)

Purpose
- Show a non-empty Dashboard with mock metrics/content (no backend required).
- Allow editing Profile fields (name, headline, avatar) and persist to localStorage.
- Validate via automated Playwright journey and a short human QA checklist.

Guardrail Prompt — Do not proceed to Module 4 until ALL are true
1) Dashboard renders non-empty test content (cards/tiles with values).
2) Profile editor updates persist after a full reload (localStorage mock).
3) Automated test passes:
   MODULE=module3 npm run journey
   → Log shows suite_complete with no pageerror; screenshots show populated Dashboard and Profile.
4) Human QA steps (below) pass with no console errors or broken nav.

Human QA Checklist
- Visit /#/dashboard in your browser; confirm visible cards/metrics (not blank).
- Go to /#/profile; edit name/headline/avatar URL; click Save (or auto-save).
- Reload the page; confirm your edits persist.
- Navigate back to /#/dashboard; confirm the header shows updated name (if implemented).
- Open devtools console; confirm no repeating errors while navigating between pages.

Install (Replit)
  npm i
  npx playwright install --with-deps
  cp .env.example .env   # set BASE_URL to your preview URL

Run automated journey
- Single module:
  MODULE=module3 npm run journey

Outputs
- Logs: logs/journey-log-module3-YYYYMMDD-HHMMSS.ndjson
- Screenshots: artifacts/screenshots/module3/*.png

Notes
- This pack assumes your app uses hash routing (/#/...). If you migrate to browser history routes later, update tests/module3.json.
- This pack does not modify your app code; it validates the screen flow and persistence behavior externally.
