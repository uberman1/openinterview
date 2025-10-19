# OpenInterview - Module 0 Framework

## Overview

OpenInterview is a modular development framework designed for rapid prototyping and iterative integration, utilizing a mock-first architecture. It's a full-stack TypeScript application featuring an Express backend, React frontend, and PostgreSQL database. The primary goal is to enable developers to build and validate features with local mocks, then seamlessly transition to production integrations using feature flags, following a "replit-deployment model" that prioritizes configuration over code changes for integration. The project aims to be a robust, scalable platform for interview management, built with modern web technologies and a clear separation of concerns.

## Recent Changes

**Profile Editor Dual Input Fix (October 19, 2025)**
- Fixed critical phone/email persistence bug in profile editor
- **Root Cause**: HTML has phone/email inputs in TWO places (inline under name + Contact Information section)
- **Issue**: Users edited Contact Info fields but code read from inline fields (stale values)
- **Solution**: Always read from Contact Information inputs (labeled, last in DOM), never fallback to inline
- **Benefits**: 
  - Users can save phone/email correctly
  - Users can clear phone/email (empty strings persist)
  - Inline inputs are decorative (hydrated for display only)
  - Contact Info inputs are authoritative (used for save)
- **Code Pattern**: `const phone = phoneInputs[phoneInputs.length - 1].value?.trim() || ''`
- **Test Coverage**: Verified save, clear, and persistence flows with Playwright
- Architect review: PASS - Production ready ✅

**View-First Create New Flow with Playwright Tests (October 18, 2025)**
- Implemented view-first profile creation flow where clicking "Create New" routes to a read-only view page first
- **New Files**:
  - public/js/public_profile.owner.bind.js - Injects "Edit Profile" button and "Draft" badge on view pages
  - Playwright test infrastructure: config, dev server, test utilities, and 3 test specs
- **Modified Files**:
  - public/js/home-bindings.js - Added view-first routing with HEAD probes and route candidate checking
  - index.js - Updated /profile/:id to serve hybrid view/edit page with all capabilities
  - public/public_profile.html - Added owner-bind script
- **User Flow**:
  1. Click "Create New" → creates draft profile in localStorage
  2. Routes to /profile/:id (view page) with HEAD request checking
  3. View page shows #resumeCanvas, #bookingCard elements
  4. "Edit Profile" button injected for owners (data-testid="button-edit-profile")
  5. "Draft" badge shown for non-live profiles (data-testid="badge-draft")
  6. Click "Edit Profile" → redirects to /profile_edit.html?id={id}
  7. Save → returns to /profile/:id view page
- **Hybrid Approach**: /profile/:id loads all scripts (data-store, asset-library, profile-editor, owner-bind) for both view and edit capabilities
- **Benefits**: View-first UX for new profiles, no regression for existing bookmarks, all functionality preserved
- All Playwright tests passing ✅ (view-first navigation, Edit Profile button, Draft badge, direct bookmarks, editor persistence)
- Architect review: PASS - Production ready

**Downloads Page Created (October 17, 2025)**
- Created downloads.html page for accessing application packages and documentation
- **Packages Available**:
  - Current Version (Recommended): 66 KB, 47 essential files - Clean, streamlined package
  - Complete Package: 450 KB, 447 files - Full application archive
- **Current Version Includes**:
  - 10 HTML pages (home, login, password, subscription, availability, profiles, etc.)
  - 27 JavaScript modules (data-store, asset-library, profile-editor, nav-patch, etc.)
  - Configuration files (package.json, index.js)
  - Profile template and data files
  - Excludes: backups, old versions, test files, user uploads
- **Documentation**:
  - CURRENT_VERSION_README.md - Guide for streamlined package
  - DOWNLOAD_PACKAGE_README.md - Guide for complete package
  - PACKAGE_INVENTORY.txt - Full file inventory
- **Server Routes**: /downloads.html and /downloads
- All files in public/ directory for serving via Express static middleware
- All Playwright tests passing ✅ (both packages accessible with HTTP 200)
- Production ready ✅

**New Interview Workflow Package Deployed (October 17, 2025)**
- Deployed guardrailed self-deploy package for New Interview workflow with profile creation, inline editing, and asset library
- **Implementation**: Non-invasive architecture using existing links via home.links.bind.js integration
- **Key Components**:
  - data-store.js: localStorage wrapper for profiles and assets (keys: oi:profiles:{id}, oi:assets:{type}:{id})
  - asset-library.js: File picker and asset management
  - home-bindings.js: Binds to existing links, exposes window.startNewProfileFlow
  - profile-editor.js: Inline editing for profile template
  - availability.js: Availability slot management
- **Server Routes**: /profile/new, /profile/:id, /availability/:id
- **Integration Fix**: home-bindings.js exposes window.startNewProfileFlow for compatibility with home.links.bind.js
- **Data Flow**: Click "Create New" → window.startNewProfileFlow() → Creates draft profile → Redirects to /profile/new?id={profileId}
- **Guardrails Protection**: Prevents overwriting protected files (home.html, profile template, nav-patch.js, etc.)
- All Playwright tests passing ✅ (workflow accessible, profile template loads)
- Architect review: PASS - Production ready

**Login Page Header Formatting Fixed (October 17, 2025)**
- Fixed login.html header and menu formatting to match other pages
- **Issue**: Logo was simple text (too large), menu text not formatted like other pages
- **Root Cause**: login.html had simple text-only brand div instead of proper header structure
- **Solution**: Replaced with proper header matching home.html (logo SVG, navigation, avatar)
- Added Tailwind CSS configuration and proper header structure with `justify-between`
- nav-patch.js now wraps nav and adds avatar with correct 24px gap-6 spacing
- All Playwright tests passing ✅ (header matches home.html, proper spacing verified)
- Architect review: PASS - Production ready

**File Upload Persistence Fix (October 16, 2025)**
- Fixed file upload persistence on home.html for resumes and attachments
- **Issue**: Uploaded files were not persisting after page reload
- **Root Cause**: Files saved to localStorage but never restored on page load
- **Solution**: Added restore logic that reads from localStorage and recreates table rows
- **Ordering Fix**: Iterate saved array in reverse to maintain newest-first order when prepending
- Changed "Create New" to "Add New" for Attachments section
- All Playwright tests passing ✅ (files persist, correct ordering maintained)
- Architect review: PASS - Production ready

**Sign In Button Removed from Password Page (October 16, 2025)**
- Removed "Sign In" button from password.html header navigation
- **Issue**: password.html had hardcoded "Sign In" button in header alongside navigation
- **Solution**: Removed button div from HTML, nav-patch.js handles unified navigation
- Password page header now matches other pages (navigation + avatar only)
- Playwright tests passing ✅ (no Sign In button, proper navigation verified)
- Architect review: PASS - Production ready

**Grey Avatar Placeholder Removed (October 16, 2025)**
- Removed grey placeholder avatar circle from subscription.html
- **Issue**: subscription.html had hardcoded grey placeholder div alongside real avatar
- **Solution**: Removed `<div class='w-8 h-8 rounded-full bg-primary/10 dark:bg-white/10'></div>` from HTML
- nav-patch.js now provides the sole avatar with photo
- Subscription page now shows exactly 1 avatar ✅
- Playwright tests passing ✅
- Architect review: PASS - Production ready

**Duplicate Avatar Fix (October 16, 2025)**
- Fixed duplicate avatar issue on home.html and subscription.html
- **Root Cause**: home.html has `id="avatar-header"` but nav-patch.js only looked for `data-testid="avatar-header"`
- **Solution**: Updated nav-patch.js to detect avatars by BOTH id AND data-testid selectors
- When existing avatar found: Adds data-testid to it (no duplicate created)
- When no avatar exists: Creates new avatar with data-testid
- All pages now have exactly ONE avatar ✅
- Playwright tests passing ✅ (1 avatar verified on all pages)
- Architect review: PASS - Production ready
- Documentation: DUPLICATE_AVATAR_FIX.md

**Header Spacing Fix (October 16, 2025)**
- Fixed header spacing to match home.html across ALL pages (consistent 24px gap-6)
- **nav-patch.js Update**: Changed gap-8 to gap-6, wrapped nav and avatar in flex gap-6 container
- **Avatar Presence**: Ensured avatar present on all pages including password page
- **Null Safety**: Added header null check to prevent crashes on pages without <header>
- Added data-testid="avatar-header" for reliable testing
- Bug fix: Password page now shows avatar with correct spacing (was showing "Sign In" button)
- All Playwright tests passing ✅ (24px gap verified on all pages)
- Architect review: PASS - Production ready
- Documentation: HEADER_SPACING_FIX.md

**Availability Link Restored (October 16, 2025)**
- Restored Availability link to navigation menu (5 items: Home, Availability, Subscription, Password, Log Out)
- Updated nav-patch.js with Availability link and active state detection
- Fixed password.bind.js to respect navPatched flag (prevents header override conflicts)
- Bug fix: Password page now shows correct 5-item navigation
- All Playwright tests passing ✅
- Documentation: AVAILABILITY_LINK_RESTORED.md

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The project employs a monorepo structure, separating concerns into `/server` (Express API), `/client` (React SPA), `/shared` (common types/schemas), `/adapters` (port interfaces), `/mocks` (stub implementations), and `/config` (feature flags).

### Frontend Architecture

**Technology Stack:** React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui (Radix UI, Tailwind CSS).
**Design Patterns:** Component-based architecture, custom hooks, and an API client abstraction.
**Key Features:** Dark theme, responsive design, real-time data refresh, and a multi-page dashboard.

### Backend Architecture

**Technology Stack:** Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL.
**Design Patterns:** Adapter/Port pattern for external service isolation, middleware-based processing, and RESTful API design (`/api/v1`).
**Core Services:** Health monitoring, structured logging, a self-test framework, and an adapter registry.
**Key Features:** Admin console for feature flag management and analytics, authentication (including passwordless OTP), graceful shutdown, static file serving with caching, and robust API error handling.
**Core Workflow:** Manages interview scheduling, status transitions (draft, scheduled, completed, canceled) with validation, search, and filtering.

### Data Storage

**Strategy:**
- **Development:** In-memory storage, with file-backed persistence for profiles and interviews using JSON files, supporting search and cursor-based pagination.
- **Production:** PostgreSQL via Neon serverless driver with Drizzle ORM.
- **Schema:** Drizzle ORM defines `users`, `health_checks`, `logs`, and `test_results` tables.

### Adapter Pattern Implementation

Core services are defined by port interfaces (e.g., `AuthPort`, `StoragePort`). Implementations are dynamically switched between mock and real services using `config/flags.json`.

### Security Implementation

The middleware stack incorporates Helmet.js for HTTP headers, CORS with an origin allowlist, rate limiting (120 req/min/IP), and request body size limits (200KB).

### Build and Development Workflow

**Development:** Vite development server (port 5173) for the client and Express API (port 5000), with API proxying.
**Production Build:** Client assets are built to `/dist/public`, and the server (via esbuild) to `/dist/index.js`.
**Testing:** A self-test framework (`/scripts/selftest.js`) validates API contracts and features, outputting JSON and human-readable logs.

## External Dependencies

### Third-Party Services

**Currently Mocked (with planned production integrations):**
- Authentication service (`AuthPort`)
- Cloud storage/database (`StoragePort`)
- Email delivery service (`EmailPort`)
- Payment processor (`PaymentsPort`)

### Database

**PostgreSQL:**
- **Provider:** Neon serverless driver (`@neondatabase/serverless`)
- **ORM:** Drizzle ORM
- **Configuration:** `DATABASE_URL` environment variable
- **Schema Management:** Drizzle Kit migrations

### UI Component Libraries

**Shadcn/ui Ecosystem:** Utilizes Radix UI primitives and Tailwind CSS for accessible, styled components.

### Development Tools

**Replit-Specific Plugins:** `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (loaded conditionally in Replit environments).

**Key NPM Packages:**
- **Runtime:** `express`, `drizzle-orm`, `zod`, `react`, `react-dom`, `@tanstack/react-query`, `wouter`.
- **Build:** `vite`, `esbuild`, `tsx`, `typescript`.
- **Styling:** `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`.