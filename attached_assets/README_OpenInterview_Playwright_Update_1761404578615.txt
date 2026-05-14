OpenInterview Playwright Suite (Store-Integrated Rewrite)
============================================================

Purpose
-------
This update replaces the old mock-memory test harness with a fully store-aware end-to-end test suite
that matches the actual OpenInterview implementation. It ensures tests run against the real
localStorage-backed `window.store` API and verifies functional flows in the live environment exactly
as users experience them.

Overview
--------
The rewritten Playwright suite:
- Aligns with the production code paths (using `window.store` and localStorage keys like `oi:profiles:*`, `oi:assets:*`).
- Tests all key profile, resume, and availability features in a realistic environment.
- Validates persistence and UI behavior across reloads and navigation.

------------------------------------------------------------
INSTRUCTIONS FOR REPLIT
------------------------------------------------------------

1. Confirm Base Configuration
-----------------------------
- The OpenInterview app runs on port 5000.
- Ensure the Playwright config has this setting:

  use: { baseURL: 'http://localhost:5000', headless: true }

- If already configured, keep it. If not, update your `playwright.config.ts` accordingly.

2. Merge Scripts into package.json
----------------------------------
Do not overwrite existing entries. Add the following lines to the "scripts" block:

  "test:e2e": "playwright test",
  "test:ui": "playwright test --ui"

3. Deploy Test Suite Files
--------------------------
Unzip `openinterview_playwright_suite_UPDATED.zip` into the project root.
This creates the following structure:

  /tests
    /utils/mocks.ts
    /fixtures/resume_parse_fixture.json
    /fixtures/mock.pdf
    /fixtures/bad.txt
    /phase1/phase1.spec.ts
    /phase2/phase2.spec.ts
    /phase3/phase3.spec.ts
    /regression/regression.spec.ts
  CONFIG_NOTES.md
  README.md

No app files are overwritten; only test and helper directories are added.

4. Start App and Run Tests
--------------------------
Start the application:
  npm run dev

Run all Playwright tests:
  npm run test:e2e

Optional (Visual UI Runner):
  npm run test:ui

------------------------------------------------------------
WHAT THIS UPDATE VERIFIES
------------------------------------------------------------

Phase 1 — HTML & Core UX
------------------------
- “Save & Return” button visibility and function.
- “Profile Name” validation and required field behavior.
- Availability help text is present; no redundant Save/Revert buttons.

Phase 2 — Resume Auto-Populate
------------------------------
- Resume dropdown lists assets from store.
- Selecting a resume triggers mock GPT autofill via fixture.
- Uploading a PDF adds a new asset and populates fields.
- Persistence verified using `store.getProfile()`.

Phase 3 — Availability Mechanics
--------------------------------
- Day toggle and time block addition via "HH:MM-HH:MM" prompt.
- Overlap rejection and block removal.
- Rule persistence (increments, buffers, notice).
- Public profile renders time slots accurately.

Regression — Persistence
-------------------------
- “Save & Return” retains data after reload through `window.store`.

------------------------------------------------------------
DEPENDENCIES
------------------------------------------------------------
- Node 18+ (default in Replit)
- @playwright/test v1.56.0 (preinstalled)
- Local app server running on http://localhost:5000

------------------------------------------------------------
DEPLOYMENT NOTES
------------------------------------------------------------
- Do NOT modify `playwright.config.ts` if already correct.
- Do NOT delete existing `e2e/` directory — this suite is additive.
- Update `baseURL` if the app runs on a different port.
- No real API keys are required for these tests.

------------------------------------------------------------
EXPECTED OUTCOME
------------------------------------------------------------
After deployment and execution:
- All tests should pass or skip conditionally if a feature is not yet wired.
- The Playwright dashboard shows green passes for Phase 1–3.
- Future schema or UI changes to store or upload flow trigger regression flags.

------------------------------------------------------------
DEPLOYMENT APPROVAL
------------------------------------------------------------
Status: Approved for immediate deployment
Environment: Replit (Local/Dev)
Owner: Replit Development Environment
Validated by: Technical Product Manager – OpenInterview
Release name: openinterview_playwright_suite_UPDATED (Store-Integrated E2E)
