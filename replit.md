# OpenInterview - Module 0 Framework

## Overview

OpenInterview is a modular development framework designed for rapid prototyping and iterative integration, utilizing a mock-first architecture. It's a full-stack TypeScript application featuring an Express backend, React frontend, and PostgreSQL database. The primary goal is to enable developers to build and validate features with local mocks, then seamlessly transition to production integrations using feature flags, following a "replit-deployment model" that prioritizes configuration over code changes for integration. The project aims to be a robust, scalable platform for interview management, built with modern web technologies and a clear separation of concerns.

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