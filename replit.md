# OpenInterview - Module 0 Framework

## Overview

OpenInterview is a modular development framework emphasizing a mock-first architecture for rapid prototyping and iterative integration of services. It's a full-stack TypeScript application with an Express backend, React frontend, and PostgreSQL database. The core purpose is to enable developers to build and validate features using local mocks before seamlessly swapping in production integrations via feature flags, adhering to a "replit-deployment model" that prioritizes configuration over code rewrites for integration. The project's ambition is to provide a robust, scalable platform for interview management, leveraging modern web technologies and a clear separation of concerns.

## Recent Changes

**Bundle A v0.2.0 - Security & Production Hardening (October 2025)**
- Deployed production-ready security, Stripe, and notification provider adapters
- **Security Extension** (`backend/addons/security_ext.py`): CSRF protection with HMAC-SHA256, rate limiting (5 req/60sec), session management with configurable TTL
- **Stripe Live Extension** (`backend/addons/stripe_ext_live.py`): Checkout integration, webhook signature verification, test mode support
- **Notify Provider** (`backend/addons/notify_provider.py`): Mock email provider with file-based outbox, extensible for production (Resend, etc.)
- Backend integration: SessionMiddleware added, routers wired into main.py, itsdangerous dependency installed
- Environment configuration: AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_SEC, SESSION_TTL_SEC, CSRF_SECRET, STRIPE_TEST, STRIPE_SIGNING_SECRET, NOTIFY_MODE
- Test packs created: auth_pack_v0_2_0 (CSRF, rate limit, session touch), subscription_pack_v0_2_0 (webhook signatures), notify_pack_v0_2_0 (OTP/generic email, outbox tracking)
- Release gate integration: patch_run_all.py orchestrator for Bundle A validation
- Manual verification procedures documented in BUNDLE_A_INTEGRATION.md
- Known limitation: Replit environment process constraints prevent automated Playwright testing with persistent backend; manual testing or requests-based alternative recommended

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The project uses a monorepo structure with distinct areas: `/server` (Express API), `/client` (React SPA), `/shared` (common types/schemas), `/adapters` (port interfaces), `/mocks` (stub implementations), and `/config` (feature flags).

### Frontend Architecture

**Technology Stack:** React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui (Radix UI, Tailwind CSS).
**Design Patterns:** Component-based, custom hooks, API client abstraction.
**Key Features:** Dark theme, responsive design, real-time data refresh, multi-page dashboard.

### Backend Architecture

**Technology Stack:** Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL.
**Design Patterns:** Adapter/Port pattern for external service isolation, in-memory storage (with PostgreSQL migration path), middleware-based processing, RESTful API design (`/api/v1`).
**Core Services:** Health monitoring, structured logging, self-test framework, adapter registry.
**Key Features:** Admin console for managing feature flags and viewing analytics, authentication (including passwordless OTP), graceful shutdown, static file serving with intelligent caching, robust API error handling.
**Core Workflow:** Interview scheduling, status management (draft, scheduled, completed, canceled) with transition validation, search, and filtering.

### Data Storage

**Strategy:**
- **Development:** In-memory storage, file-backed persistence (`/server/data/fsStore.ts`) for profiles and interviews using JSON files (`/data/profiles.json`, `/data/interviews.json`). File-backed storage supports search and cursor-based pagination.
- **Production:** PostgreSQL via Neon serverless driver with Drizzle ORM.
- **Schema:** Drizzle ORM defines `users`, `health_checks`, `logs`, `test_results` tables.

### Adapter Pattern Implementation

Core services are defined by port interfaces (`AuthPort`, `StoragePort`, `EmailPort`, `PaymentsPort`). Implementations are controlled by `config/flags.json`, allowing seamless switching between mock and real services.

### Security Implementation

Middleware stack includes Helmet.js for HTTP headers, CORS with an origin allowlist, rate limiting (120 req/min/IP), and request body size limits (200KB).

### Build and Development Workflow

**Development:** Vite dev server (5173) and Express API (5000) with API proxying.
**Production Build:** Client to `/dist/public`, server (esbuild) to `/dist/index.js`.
**Testing:** Self-test framework (`/scripts/selftest.js`) validates API contracts and features per module, outputting JSON and human-readable logs.

## External Dependencies

### Third-Party Services

**Currently Mocked (planned integrations):**
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

**Replit-Specific Plugins:** `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (conditional loading for Replit environments).

**Key NPM Packages:**
- **Runtime:** `express`, `drizzle-orm`, `zod`, `react`, `react-dom`, `@tanstack/react-query`, `wouter`.
- **Build:** `vite`, `esbuild`, `tsx`, `typescript`.
- **Styling:** `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`.