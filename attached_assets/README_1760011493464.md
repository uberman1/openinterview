# OpenInterview Profile — Version 4.1 (Self‑Deploying)

This package contains a **self-deploying** Node static server for the Profile page v4.1 with:
- Functional **calendar** (.ics generation + toast)
- Functional **resume** PDF pagination using PDF.js
- Functional **attachments** downloads
- **Guardrails** to prevent UI changes
- **Unit tests** (Jest + jsdom) with remediation suggestions

## Quick Start (Replit or local)
1. Import the ZIP into Replit (Node.js template recommended) or unzip locally.
2. In the shell: `npm i`
3. Run tests & guardrails: `npm test`
4. Start the server: `npm start`
   - Visit http://localhost:3000

## Files to Customize
- `public/index.html`: DO NOT change UI classes/structure. Only substitute file URLs in `data-file-url` and `data-resume-url`.
- `public/app.js`: Business logic only. Keep exported test hooks intact.

## Guardrails
- `guardrails/verify-ui.js` compares the current `index.html` core UI against a locked snapshot in `tests/snapshots/ui.snapshot.html`.
- Any class or structural changes in critical sections will **fail** `npm test` and block `npm run deploy`.

## Agent3 Policy (advisory)
- Automation may perform: dependency install, run scripts, deploy server.
- Automation may NOT: edit HTML structure/classes in `public/index.html` or change calendar/resume layouts.
- Violations will fail guardrails step.

## 4.1b (server-backed booking)
Saved for later. This package is 4.1 (client-only .ics). A future 4.1b can POST bookings to backend without UI changes.
