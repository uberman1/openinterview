
# OpenInterview • Module 1 (Login)

Minimal, Replit-ready pack for the **Login** flow + mock API stubs.

## Run (Replit or local)
1. Install: `npm install`
2. Start server: `npm start`
3. Open: `/login.html`

## Self-test
Run: `npm test`  
You should see a read-out like:
```
OpenInterview • Module 1 (Login) • Self-test
-------------------------------------------
✔ serves /login.html
✔ POST /api/auth/login returns user role
✔ POST /api/auth/login returns admin role
✔ GET public profile by handle
✔ GET admin users

Summary: 5 passed, 0 failed
```

## What’s included
- Exact **Login** page (white bg, black text, **black Continue button**).
- Auth endpoint (`POST /api/auth/login`) that returns a user with role **user** or **admin**.
- Public profile & admin stubs to support later modules and the self-test.
- **seed.json** with demo users and a profile handle `ethan`.

## Next modules
- **Module 2 (User)**: Profile dashboard, Availability, Uploads, etc.
- **Module 3 (Recruiter)**: Public shareable profile with booking.
- **Module 4 (Admin)**: Admin dashboard pages.
