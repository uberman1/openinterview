# OpenInterview — Replit Deploy (Editable Profile)

This bundle updates the **Editable Profile** page binder with:
- Auto-populate from resume (top selector / drag-drop)
- GPT extraction to fill: name, title, contact, socials, bio, highlights
- Inline availability editor (replaces availability.html)
- Unified resume/attachments render
- Non-destructive: uses your exact HTML

## Files
- `deploy/profile_edit.bind.js` — drop-in ES module for your editable profile page
- `docs/CHANGELOG.md` — summary of changes
- `docs/POST_DEPLOY_CHECKS.md` — quick manual test checklist
- `outputs/deploy_report.json` — verification of key functions in the module

## How to integrate
1. Upload this folder to Replit (or extract the ZIP).
2. Put `profile_edit.bind.js` where your HTML expects modules (e.g. `/public/js/`).
3. In your **Editable Profile HTML**, add:
   ```html
   <script type="module" src="/js/profile_edit.bind.js"></script>
   ```
4. Ensure backend endpoints exist:
   - `POST /api/ai/extract_profile` (multipart: `file`, `profileId`)

5. Ensure global helpers exist:
   - `app.js`: exports `$, $$, toast`
   - `data-store.js`: exports `getProfile`, `updateProfile`

## Notes
- Uploads currently use `fakeUpload()` (Object URL). Replace with your real upload endpoints.
- Availability changes persist via the **Save** button inside the Availability section.
