# OpenInterview - Module 0 Framework

## Overview

OpenInterview is a modular development framework built on a mock-first architecture that enables rapid prototyping and iterative integration of real services. The application uses an adapter pattern to isolate external dependencies behind stable interfaces, allowing developers to build core functionality locally before swapping in production integrations via feature flags.

This is a full-stack TypeScript application with an Express backend, React frontend, and PostgreSQL database. The system is designed for the "replit-deployment model" - build and validate core features using mocks, then progressively replace them with real implementations through configuration changes rather than code rewrites.

## Recent Changes

**Auth & Session Pack v0.1.1 - QA Integration (October 2025)**
- Integrated passwordless OTP authentication testing pack into release gate orchestration
- Backend auth extension (`backend/addons/auth_ext.py`) with 5 endpoints: signup, verify, logout, session, csrf
- Comprehensive test suite: contract (9 selectors), behavior (signup flow with async wait), a11y (live region), security (CSP), visual (baseline)
- Same-origin security: CORS restricted to `["http://localhost:8000", "http://127.0.0.1:8000"]` with credentials enabled
- Frontend test harness: `public/auth_test.html` with same-origin binder (`auth.bind.js`) using `window.location.origin`
- System chromium integration with executable_path for headless Playwright testing
- Release gate expanded to 8 packs (password, subscription, availability, shareable_profile, profiles, uploads, home, auth)
- All packs achieving 100% PASS rate in CI/CD validation
- Test artifacts: `qa/auth/v0.1.1/` with tests.json, tests.txt, and visual baselines
- New files: `auth_pack/tests.py`, `auth_pack/run.py`, `public/auth_test.html`, `public/auth.bind.js`, `scripts/patch_backend_cors.sh`

**Module 12 - Admin Console UI and Feature Flags (October 2025)**
- Added feature flags storage system (`/server/flags.store.ts`) with 5 flags: enableEmails, enablePayments, enableCloudStorage, enableSupabase, enableVideoPipeline
- Implemented admin console routes (`/server/admin.console.routes.ts`):
  - `GET /api/v1/admin/users`: Lists users from users.json or derives from profiles
  - `GET /api/v1/admin/flags`: Returns feature flags configuration
  - `PATCH /api/v1/admin/flags`: Updates feature flags (persists to flags.json)
- Added AdminConsole React component (`/client/src/pages/AdminConsole.jsx`) with stats, flags management, and user list
- Route wiring: `/admin` path accessible to admin users
- Access control: 401 for unauthenticated, 403 for non-admin, 200 for admin@example.com
- Build size: 39.6kb (dist/index.js)
- Test coverage: Module 12 selftest validates auth, admin guards, stats retrieval, flags CRUD, and user listing
- New files: `/server/flags.store.ts`, `/server/admin.console.routes.ts`, `/client/src/pages/AdminConsole.jsx`

**Module 11 - Deployment Readiness (October 2025)**
- Added health check endpoints: `GET /api/v1/ready` (readiness probe), `GET /api/v1/live` (liveness probe)
- Implemented graceful shutdown handler for SIGINT/SIGTERM with 5-second timeout fallback
- Static file serving with intelligent cache headers:
  - `/assets/*`: Cache-Control: public, max-age=3600 (1 hour)
  - HTML files: Cache-Control: no-store (always fresh)
- Critical bug fix: API 404s now return proper JSON errors instead of index.html
  - Added explicit API 404 handler before static middleware to prevent SPA catch-all from hijacking unmatched API routes
- Build size: 38.1kb (dist/index.js)
- Test coverage: Module 11 selftest validates readiness/liveness endpoints, graceful shutdown, cache headers, and API 404 handling
- New files: `/server/ops.readiness.ts`, `/server/ops.shutdown.ts`, `/server/ops.static.ts`

**Module 10 - Admin Analytics Endpoints (October 2025)**
- Added `requireAdmin` middleware (`/server/middleware/requireAdmin.ts`) for role-based access control
- Implemented admin analytics endpoint: `GET /api/v1/admin/stats`
- Analytics data: totals (profiles, interviews), interviewsByStatus breakdown, recentProfiles/Interviews (7-day window)
- Access control: 401 for unauthenticated requests, 403 for non-admin users, 200 for admin@example.com
- Enhanced mock auth with signup endpoint and global user attachment middleware
- Build size: 36.1kb (dist/index.js)
- Test coverage: Module 10 selftest validates authentication, authorization, and analytics aggregation

**Module 09 - Interview Workflow with Scheduling and Status Management (October 2025)**
- Added interview scheduling with `scheduledAt` field (ISO datetime)
- Status management: draft (initial), scheduled, completed, canceled (terminal states)
- Status transition validation: prevents invalid transitions (e.g., completed → scheduled)
- Reminder endpoint: `POST /api/v1/interviews/:id/remind` logs to `logs/mod-09.log`
- Enhanced filtering: status, date range (from/to), and search (title/notes)
- Data tracking: `createdAt`, `updatedAt`, optional `notes` field

**Module 08 - Dashboard Session Handling (October 2025)**
- Added `requireAuth` middleware for protected routes
- Dashboard endpoint: `GET /api/v1/dashboard` aggregates user/plan/profiles/interviews
- Authentication required: 401 for unauthenticated requests
- Returns user info, payment plan, and aggregated data from file-backed storage

**Module 07 - File-Backed Persistence with Search and Pagination (October 2025)**
- Added file-backed persistence layer (`/server/data/fsStore.ts`) for profiles and interviews
- Implemented search and pagination capabilities for profiles and interviews
- Profiles: Search by name/email/headline with case-insensitive matching
- Interviews: Filter by profileId and search by title
- Pagination: Cursor-based pagination with configurable limits (1-50 items per page)
- Data storage: JSON files in `/data` directory (profiles.json, interviews.json)
- Duplicate email protection: Returns 409 status on duplicate email attempts
- Test coverage: Module 07 selftest validates all persistence, search, and pagination features

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The repository follows a monorepo pattern with clear separation of concerns:

- **Server (`/server`)**: Express API server with TypeScript
- **Client (`/client`)**: React SPA built with Vite
- **Shared (`/shared`)**: Common TypeScript types, schemas, and constants
- **Adapters (`/adapters`)**: Port interfaces for external services
- **Mocks (`/mocks`)**: Local stub implementations of adapters
- **Config (`/config`)**: Feature flags and configuration

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling and development server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- Shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with CSS custom properties for theming

**Design Patterns:**
- Component-based architecture with reusable UI primitives
- Custom hooks for cross-cutting concerns (mobile detection, toasts)
- API client abstraction layer (`/client/src/lib/api.ts`)
- Centralized query configuration with custom query functions

**Key Features:**
- Dark theme with custom color system
- Responsive design with mobile-first approach
- Real-time data refresh capabilities
- Multi-page dashboard interface (Overview, Health, Adapters, Flags, Tests, Logs)

### Backend Architecture

**Technology Stack:**
- Node.js with Express
- TypeScript with ES modules
- Drizzle ORM for database operations
- PostgreSQL (via Neon serverless driver)

**Design Patterns:**
- Adapter/Port pattern for external service isolation
- In-memory storage with planned PostgreSQL migration
- Middleware-based request processing pipeline
- RESTful API design with versioned endpoints (`/api/v1`)

**Core Services:**
- Health monitoring and system status reporting
- Logging system with structured log storage
- Self-test framework for contract validation
- Adapter registry for dependency injection

### Data Storage

**Database Schema (Drizzle ORM):**
- `users`: User accounts with role-based access
- `health_checks`: System health snapshots with timestamps
- `logs`: Application logging with level, source, and message
- `test_results`: Automated test execution records

**Storage Strategy:**
- Development: 
  - In-memory storage (`MemStorage` class) for zero-dependency local development
  - File-backed persistence (`/server/data/fsStore.ts`) for profiles and interviews with search/pagination
  - JSON storage in `/data` directory (profiles.json, interviews.json)
- Production: PostgreSQL via Neon serverless (configured via `DATABASE_URL`)
- Migration path: Drizzle Kit for schema migrations in `/migrations` directory

**File-Backed Persistence (Module 07):**
- `fsStore.ts` provides `load()`, `save()`, and `paginate()` utilities
- Atomic writes using temp files and rename for data safety
- Cursor-based pagination with configurable limits (1-50 items)
- Search filtering with case-insensitive matching
- Automatic directory creation and error handling for missing files

The `IStorage` interface defines the contract, allowing seamless swapping between implementations.

### Adapter Pattern Implementation

**Port Interfaces:**
- `AuthPort`: User authentication and authorization
- `StoragePort`: Key-value data persistence
- `EmailPort`: Transactional email sending
- `PaymentsPort`: Payment processing and checkout sessions

**Configuration-Driven Behavior:**
The `config/flags.json` file controls which adapter implementations are loaded:
```json
{
  "useMockAdapters": true,
  "adapters": {
    "auth": "mock",
    "storage": "mock",
    "email": "mock",
    "payments": "mock"
  }
}
```

When `useMockAdapters` is true, the system loads mock implementations that return predictable test data without external network calls. Real implementations are swapped in by changing flags and providing appropriate environment variables.

### Security Implementation

**Middleware Stack:**
- Helmet.js for HTTP security headers
- CORS with origin allowlist (configurable via `ALLOWED_ORIGINS` env var)
- Rate limiting: 120 requests per minute per IP
- Request body size limits: 200KB max
- Access logging to `/logs/access.log`

**Design Philosophy:**
Security is implemented as composable middleware layers that can be adjusted per environment without changing core application code.

### Build and Development Workflow

**Development Mode:**
- Vite dev server with HMR on port 5173 (configurable)
- Express API on port 5000 (configurable)
- Proxy setup routes `/api` requests from frontend to backend
- TypeScript compilation with `noEmit` (handled by build tools)

**Production Build:**
- Client: Vite builds to `/dist/public`
- Server: esbuild bundles to `/dist/index.js` with external packages
- Single entry point: `node dist/index.js`

**Testing Strategy:**
- Self-test framework (`/scripts/selftest.js`) validates API contracts and build process
- Module-based testing: Modules 00-07 each have specific test suites
- Outputs machine-parsable JSON (`/logs/selftest.mod-XX.json`) and human-readable logs (`/logs/mod-XX.log`)
- Module 07 tests: Profiles creation/search, interviews creation/listing, pagination, duplicate detection
- Health check endpoints provide real-time system validation
- Run tests: `MODULE_NUM=XX node scripts/selftest.js` where XX is 00-07

## External Dependencies

### Third-Party Services

**Planned Integrations (currently mocked):**
- Authentication service (interface: `AuthPort`)
- Cloud storage/database (interface: `StoragePort`)
- Email delivery service (interface: `EmailPort`)
- Payment processor (interface: `PaymentsPort`)

All integrations use the adapter pattern - real implementations will be added in `/adapters` with corresponding configuration in feature flags.

### Database

**PostgreSQL (via Neon):**
- Connection: Neon serverless driver (`@neondatabase/serverless`)
- ORM: Drizzle ORM with TypeScript schema definitions
- Environment variable: `DATABASE_URL`
- Schema management: Drizzle Kit migrations
- Deployment: Run `npm run db:push` to sync schema

Note: The application can run without a database in development mode using in-memory storage.

### UI Component Libraries

**Shadcn/ui Ecosystem:**
- Radix UI primitives for accessible components
- Custom Tailwind configuration with CSS variables
- Component registry: `/components.json`
- Path aliases configured for clean imports

### Development Tools

**Replit-Specific Plugins:**
- `@replit/vite-plugin-runtime-error-modal`: Enhanced error overlay
- `@replit/vite-plugin-cartographer`: Development tooling
- `@replit/vite-plugin-dev-banner`: Development environment indicator

These plugins are conditionally loaded only in development environments when `REPL_ID` is present.

### Key NPM Packages

**Runtime:**
- `express`: Web framework
- `drizzle-orm`: Database ORM
- `zod`: Schema validation
- `react`, `react-dom`: UI framework
- `@tanstack/react-query`: Server state management
- `wouter`: Lightweight routing

**Build Tools:**
- `vite`: Frontend build tool and dev server
- `esbuild`: Server bundler
- `tsx`: TypeScript execution for development
- `typescript`: Type checking

**Styling:**
- `tailwindcss`: Utility-first CSS
- `class-variance-authority`: Component variant management
- `clsx`, `tailwind-merge`: Conditional class utilities