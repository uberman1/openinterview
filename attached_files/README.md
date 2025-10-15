# Self-Deploying Guardrails Patch (Replit)

This zip **auto-appends** a runtime patch into your existing `home-uat.js`
to fix the issues:

- Avatar upload error -> replaced with client-side FileReader preview + persistence
- Duplicate **Attachments** sections -> remove duplicates at runtime
- Duplicate upload links -> keep a **single bottom** link and (re)bind it
- No HTML changes required

## Use
1) Upload and extract this zip into your Replit project root.
2) Run:
```bash
node apply-guardrails.mjs
```
   - If your file lives in a non-standard path, pass it explicitly:
```bash
node apply-guardrails.mjs ./public/js/home-uat.js
```
3) Refresh the page to verify:
   - Only one Attachments section
   - One bottom “Add New” (Resumes) and one bottom “Create New” (Attachments)
   - Avatar updates instantly without network or alerts

A timestamped `.bak` backup of your original file is created next to it.
