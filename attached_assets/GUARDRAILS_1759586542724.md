# GUARDRAILS — Module 1 (Login)

**Audience:** Agent 3 (and any automated contributor).  
**Objective:** Prevent unplanned changes to the approved Module 1 UI and behavior.

## Non‑negotiables (DO NOT CHANGE)
1) Visuals must remain **pixel-identical** to the approved render.
2) Theme tokens (colors, radii, spacing) in `public/css/theme.css` must not change.
3) Markup structure in `public/login.html` must not change (IDs, classes, and hierarchy).
4) No new dependencies, frameworks, or resets. Keep Express only.
5) Routing logic must remain: **admin → /admin.html**, others → **/profile.html**.

## Allowed changes
- Documentation updates (README/GUARDRAILS).
- Test improvements in `selftest.mjs` **that do not relax** checksum checks.
- Accessibility copy changes that **do not alter layout** (e.g., aria-label text).

## Change control
- Any UI change requires a ticket titled **LOGIN-UI-CHANGE** with a side-by-side screenshot.
- Update the checksums section in `selftest.mjs` and include the new hashes in the PR.
- PR is rejected if `npm test` fails.

## Checksums (current, do not edit without approval)
- `public/login.html` — SHA256: `b930f8d8e24ca5d4444e6187830d651261912a635ebdd3f07305edcf571dd42b`
- `public/css/theme.css` — SHA256: `a87605d2d1ebf9461f0458b1eee3a681a367dd84ad868c160e770c2ccedb46dc`

## Quick checklist before commit
- [ ] Self-test passes locally (`npm test`).
- [ ] No visual drift from the approved render.
- [ ] No new packages added to `package.json`.
- [ ] Role routing verified with **user@example.com** and **admin@example.com**.

- `public/index.html` — SHA256: `c6c62c874b8329b376ff9922023b427fee2ff7ca6436891bd9429cab59594b0c`
