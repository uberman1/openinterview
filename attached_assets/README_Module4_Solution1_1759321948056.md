# Module 4 — Solution 1 (Minimal Integration) Patch

Goal
- Keep the existing TypeScript + Vite architecture.
- Switch routing to the unified auth router (`mountAuth`) that selects mock vs real by `USE_MOCK_AUTH`.
- Do NOT change package.json, env, or install packages.

What’s included
1) server/auth.routes.d.ts
   - Type declaration so you can import `mountAuth` from the JS file without LSP noise.

2) server/routes.ts.patch
   - A concise patch to apply to your existing `server/routes.ts`.
   - If your file differs, use the included reference (`server/routes.reference.ts`) as a guide.

3) server/routes.reference.ts
   - A self-contained example showing how `registerRoutes` wires `mountAuth(app, API_BASE)` before other routes.

How to apply
1) Add the declaration file:
   - Copy `server/auth.routes.d.ts` → `<repo-root>/server/auth.routes.d.ts`

2) Patch your existing `server/routes.ts`:
   - Open `<repo-root>/server/routes.ts`
   - Make the three edits shown in `server/routes.ts.patch`:
     a) Replace mock imports with unified router import
     b) Remove global `attachUser`
     c) Call `mountAuth(app, API_BASE)` before other API routes and update health flags

3) Build and test Module 4 with the real adapter:
   ```bash
   npm run build
   USE_MOCK_AUTH=false MODULE_NUM=04 node scripts/selftest.js
   ```

Expected
- Server starts cleanly.
- `POST /api/v1/auth/signup` returns `201`.
- `logs/selftest.mod-04.json` shows `passed: true`.
- `logs/mod-04.log` contains `POST /api/v1/auth/signup 201`.

Guardrails for Agent 3
----------------------
Scope: Keep the TS/Vite architecture. Do not change package.json, env, or install packages.

Allowed file edits only:
- Add `/server/auth.routes.d.ts` from this patch.
- Edit `/server/routes.ts` to:
  * Remove mock imports/usage: `attachUser`, `mountAuthRoutes`.
  * Import `{ mountAuth }` from `"./auth.routes.js"`.
  * Call `mountAuth(app, API_BASE)` before other API routes.
  * Optionally add `useMockAuth` in the health JSON flags.
No other files should be modified.

Run exactly:
  npm run build
  USE_MOCK_AUTH=false MODULE_NUM=04 node scripts/selftest.js

Success criteria:
- `POST /api/v1/auth/signup` returns 201.
- `logs/selftest.mod-04.json` shows `auth.signup` PASSED and `passed: true`.
- `logs/mod-04.log` includes "POST /api/v1/auth/signup 201".
