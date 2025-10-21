# Development Sync Packages - Installation Guide

## Overview

These sync packages contain the latest updates to OpenInterview including **PostgreSQL-backed asset storage** that enables centralized resume and attachment management across all profiles.

**Date:** October 21, 2025
**Version:** v1.0.1 (PostgreSQL Asset Storage Update)

---

## Package Contents

### Package 1: Core Backend (91 KB, 41 files) 🔴 **CRITICAL**
**PostgreSQL Integration**
- `index.js` - Updated with PostgreSQL asset API routes
- `server/` - Backend routes and services
- `shared/` - Drizzle schema with assets table
- `drizzle.config.ts` - Database configuration
- `package.json`, `package-lock.json` - Dependencies

### Package 2: Public HTML & JS (16 MB, 7,274 files) 🔴 **CRITICAL**
**Frontend Updates**
- `public/` - All HTML pages and JavaScript modules
- Updated `data-store.js` with PostgreSQL API sync
- Updated `profile_edit.bind.js` with dual-layer storage
- All UI components and assets

### Package 3: Config & Data (2.9 KB, 6 files)
**Configuration Files**
- `config/` - Feature flags and settings
- `data/` - Profiles and interviews data

### Package 4: Adapters & Mocks (877 B, 4 files)
**Adapter Pattern**
- `adapters/` - Service adapter implementations
- `mocks/` - Mock service implementations

### Package 5: Client (55 KB, 102 files)
**React Frontend**
- `client/` - React components, hooks, and UI library
- Shadcn/ui components
- TanStack Query setup

---

## Installation Instructions

### Step 1: Download Packages
Download all 5 packages from the Downloads page at `/downloads.html`

### Step 2: Backup Your Current Project (IMPORTANT!)
```bash
# Create a backup of your current project
cd /path/to/your/project
tar -czf ../openinterview-backup-$(date +%Y%m%d).tar.gz .
```

### Step 3: Extract Packages
Extract each package in the **root directory** of your project:

```bash
# Navigate to your project root
cd /path/to/your/project

# Extract each package (they will merge with existing files)
tar -xzf sync-package-1-core-backend.tar.gz
tar -xzf sync-package-2-public.tar.gz
tar -xzf sync-package-3-config-data.tar.gz
tar -xzf sync-package-4-adapters-mocks.tar.gz
tar -xzf sync-package-5-client.tar.gz
```

### Step 4: Review Critical Files
Check these key files that contain PostgreSQL integration:

1. **index.js** - Lines 200-300 contain new asset API routes
2. **public/js/data-store.js** - Look for `syncAssetsFromAPI()` function
3. **public/js/profile_edit.bind.js** - Check for database integration
4. **shared/schema.ts** - Review the `assets` table schema

### Step 5: Database Setup
Ensure your PostgreSQL database is configured:

```bash
# Verify DATABASE_URL environment variable exists
echo $DATABASE_URL

# Push schema to database
npm run db:push

# If you get a data-loss warning, use force:
npm run db:push --force
```

### Step 6: Install Dependencies
```bash
npm install
```

### Step 7: Restart Development Server
```bash
npm run dev
```

---

## What's New in This Update

### PostgreSQL-Backed Asset Storage ✨
- **Centralized Database:** All resumes and attachments now stored in PostgreSQL
- **Cross-Profile Sharing:** Assets available across all profiles via dropdown
- **Persistent Storage:** Assets survive server restarts
- **API Routes:** New `/api/v1/assets` endpoints (GET, POST, DELETE)

### Technical Changes
1. **Backend (index.js):**
   - Added Drizzle ORM connection using Neon serverless driver
   - Implemented asset API routes with PostgreSQL queries
   - Field mapping between frontend (`url`) and database (`storage_url`)

2. **Frontend (data-store.js):**
   - New `syncAssetsFromAPI()` function loads assets from database
   - Dual-layer approach: localStorage for UI + API for persistence
   - Automatic sync on page load

3. **Database Schema:**
   ```sql
   CREATE TABLE assets (
     id VARCHAR PRIMARY KEY,
     type TEXT NOT NULL,
     name TEXT NOT NULL,
     storage_url TEXT,
     file_size TEXT,
     mime_type TEXT,
     uploaded_at TIMESTAMP NOT NULL,
     owner_user_id VARCHAR NOT NULL,
     tags TEXT[]
   );
   ```

---

## Verification Steps

### 1. Check Application Starts
```bash
npm run dev
# Should start without errors
# Navigate to http://localhost:5000
```

### 2. Test Profile Editor
- Navigate to `/profile_edit_enhanced.html`
- Check that "Auto-populate with Resume" section appears
- Verify resume dropdown shows "Select a resume"

### 3. Test Asset Upload
- Click "browse" to upload a test PDF
- Check browser console for successful API call
- Verify asset appears in dropdown

### 4. Test Database Persistence
- Upload an asset
- Restart the server (`Ctrl+C`, then `npm run dev`)
- Reload the profile editor
- **Expected:** Asset still appears in dropdown ✅

### 5. Test Cross-Profile Sharing
- Create a new profile
- Navigate to its editor
- **Expected:** Previously uploaded assets appear in dropdown ✅

---

## Troubleshooting

### Issue: "Cannot find module 'drizzle-orm'"
**Solution:**
```bash
npm install
```

### Issue: Database connection fails
**Solution:**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Should output: postgresql://...
# If empty, contact Replit support
```

### Issue: Assets not appearing in dropdown
**Solution:**
```bash
# Check browser console for errors
# Look for API call to /api/v1/assets

# Verify database table exists:
# Run this SQL query in Replit Database pane:
SELECT * FROM assets;
```

### Issue: "npm run db:push" shows data loss warning
**Solution:**
```bash
# Use force flag to push schema
npm run db:push --force
```

### Issue: Old files conflict with new files
**Solution:**
```bash
# Compare file sizes/dates
ls -lh index.js
# If old version, re-extract:
tar -xzf sync-package-1-core-backend.tar.gz
```

---

## API Compatibility

### New Data Store API
The updated `data-store.js` maintains backward compatibility while adding PostgreSQL sync:

```javascript
// OLD (still works)
import { store } from './data-store.js';
const profile = store.getProfile({ id });

// NEW (PostgreSQL-backed)
await store.syncAssetsFromAPI();  // Loads from database
const assets = store.getAssets('resume');  // Filtered by type
```

### Asset Structure
```javascript
{
  id: "uuid",
  type: "resume" | "attachment",
  name: "Resume.pdf",
  url: "blob:...",           // Frontend blob URL
  storage_url: "...",        // Database storage URL
  file_size: "1.2 MB",
  mime_type: "application/pdf",
  uploaded_at: "2025-10-21T...",
  owner_user_id: "user-uuid",
  tags: ["resume", "pdf"]
}
```

---

## Rollback Instructions

If you encounter critical issues:

```bash
# Stop the server
# Restore from backup
cd /path/to/your/project
rm -rf *
tar -xzf ../openinterview-backup-YYYYMMDD.tar.gz

# Restart
npm run dev
```

---

## Support

- **Documentation:** See `replit.md` for architecture details
- **Logs:** Check browser console and server logs
- **Database:** Use Replit Database pane for SQL queries
- **Tests:** Run Playwright tests to verify functionality

---

## Success Criteria ✅

Your sync is successful when:
- ✅ Server starts without errors
- ✅ Profile editor loads correctly
- ✅ Resume dropdown populates from database
- ✅ Assets persist across server restarts
- ✅ Assets are shared across all profiles
- ✅ No console errors in browser

---

**Happy coding! 🚀**
