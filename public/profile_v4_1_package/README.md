# OpenInterview Profile — Version 4.1 (Self‑Deploying)

This package contains a **self-deploying** Node static server for the Profile page v4.1 with:
- Functional **calendar** (.ics generation + toast)
- Functional **resume** PDF pagination using PDF.js
- Functional **attachments** downloads
- **Guardrails** to prevent UI changes
- **Unit tests** (Jest + jsdom) with remediation suggestions

## Quick Start (Separate Server on Port 3000)

**This package runs independently from the main OpenInterview app (port 5000).**

### Method 1: Using the start script
```bash
cd profile_v4_1_package
./start.sh
```

### Method 2: Direct commands
```bash
cd profile_v4_1_package
npm i          # Install dependencies (first time only)
npm test       # Run tests & guardrails
npm start      # Start server on port 3000
```

### Access Points
- **Direct v4.1 Access:** http://localhost:3000
- **Via Versions Index:** http://localhost:5000/profiles_v2.html (click "page" link for v4.1)
- **Main App:** http://localhost:5000

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
