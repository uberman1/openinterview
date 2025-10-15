# Bundle D — Advanced Features (Modules 10–11)

Modules
- Module 10: Pagination & Search
- Module 11: Admin Console

Install (once)
  npm i
  npx playwright install --with-deps
  cp .env.example .env   # set BASE_URL

Run a single module
  MODULE=module10 npm run journey
  MODULE=module11 npm run journey

Run them all
  npm run journey:all

Logs
  logs/journey-log-<MODULE>-YYYYMMDD-HHMMSS.ndjson
Screenshots
  artifacts/screenshots/<MODULE>/*.png

==================================================
Module 10 — Pagination & Search
==================================================
Goal
- List pages support client-side pagination and search with mock data.

Guardrail Prompt — Do not proceed to Module 11 until ALL are true
1) A list view renders at /#/browse (or adapt to an existing page like /#/jobs).
2) Next/Prev (or page numbers) change the visible items and reflect state in the URL (e.g., ?page=2&query=foo).
3) Search input filters visible items; clearing the query resets the list.
4) Automated journey passes: MODULE=module10 npm run journey.
Human QA
- Visit /#/browse, paginate to at least page 2, then back to 1.
- Enter a search term; verify list filters and pagination updates.
- Refresh the page; verify the current page and query restore from URL.

Optional stub provided: src/pages/PaginationSearchMock.jsx

==================================================
Module 11 — Admin Console
==================================================
Goal
- Admin-only area to view users and videos (mock data). Non-admins blocked.

Guardrail Prompt — Before moving to Bundle E, confirm ALL are true
1) /#/admin renders an Admin home with links to /#/admin/users and /#/admin/settings.
2) /#/admin/users shows a table with mock users and simple actions (e.g., toggle is_public).
3) Non-admin visits to /#/admin paths are blocked or redirected.
4) Automated journey passes: MODULE=module11 npm run journey.
Human QA
- Visit /#/admin, click Users and Settings.
- Toggle a user property; verify the change persists in localStorage.
- Try visiting /#/admin as a non-admin mock user and confirm access is blocked.

Optional stubs provided: src/pages/AdminConsoleMock.jsx
