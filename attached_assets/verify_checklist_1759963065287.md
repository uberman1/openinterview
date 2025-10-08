# Verification Checklist

1) Network
- [ ] `/api/public/profile/:handle` returns 200 **or** the page shows a friendly "Profile not found" message (no JS crash).
- [ ] `/api/availability?userId=...` returns 200 **or** calendar area shows "No available time slots."

2) Console
- [ ] No uncaught exceptions.
- [ ] Warnings allowed.

3) Layout & Scrolling
- [ ] Sticky hero/video present as before (no `body { overflow: hidden }` enforced by script).
- [ ] Spacing between video and content area visible (roughly `mt-12` ≈ 3rem).
- [ ] Page scroll works normally.

4) Calendar
- [ ] With seeded data: slots render.
- [ ] With no data: friendly empty state renders.

5) File mapping
- [ ] Viewing **page source** shows the injected `<script src="/static/js/public_profile.safe.js" ...>` tag.
