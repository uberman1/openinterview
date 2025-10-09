# Agent & Guardrails Policy

**Purpose:** Preserve product-approved UI while allowing functional code to evolve.

## Allowed (Automation)
- Install dependencies.
- Run test & deploy scripts.
- Modify `public/app.js` for **logic only** (no DOM structure/class changes in HTML).
- Add tests.

## Not Allowed
- Change Tailwind classes or structure for:
  - Video header block
  - Attachments list container and link rows
  - Resume container (aspect box, pagination bar)
  - Calendar card (month header row, weekday headers, grid columns, time pills, email row, confirm button)
- Replace `public/index.html` wholesale.

## Enforcement
- `guardrails/verify-ui.js` validates index.html against a snapshot. Any deviations fail CI and `npm run deploy`.
