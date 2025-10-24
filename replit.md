# OpenInterview - Module 0 Framework

## Overview

OpenInterview is a modular development framework for rapid prototyping and iterative integration, utilizing a mock-first architecture. It's a full-stack TypeScript application with an Express backend, React frontend, and PostgreSQL database. The core purpose is to enable developers to build and validate features with local mocks and seamlessly transition to production integrations using feature flags, following a "replit-deployment model" that prioritizes configuration over code changes. The project aims to be a robust, scalable platform for interview management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The project uses a monorepo structure, separating concerns into `/server`, `/client`, `/shared`, `/adapters`, `/mocks`, and `/config`.

### Frontend Architecture

**Technology Stack:** React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui (Radix UI, Tailwind CSS).
**Design Patterns:** Component-based architecture, custom hooks, and an API client abstraction.
**Key Features:** Dark theme, responsive design, real-time data refresh, and a multi-page dashboard.
**UI/UX Decisions:** Implemented view-first profile creation flow, consistent header formatting across pages, robust file upload/persistence mechanisms, and video upload UI with thumbnail customization.

### Backend Architecture

**Technology Stack:** Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL.
**Design Patterns:** Adapter/Port pattern for external service isolation, middleware-based processing, and RESTful API design (`/api/v1`).
**Core Services:** Health monitoring, structured logging, a self-test framework, and an adapter registry.
**Key Features:** Admin console for feature flag management and analytics, authentication (passwordless OTP), graceful shutdown, static file serving with caching, robust API error handling, and Cloudinary video upload integration.
**Core Workflow:** Manages interview scheduling, status transitions, search, and filtering.
**Video Integration:** Server route (`/api/v1/upload/sign`) generates signed upload parameters for direct Cloudinary uploads. Client helpers handle video and thumbnail uploads with progress tracking. Public profiles support HLS streaming with MP4 fallback.

### Data Storage

**Strategy:**
- **Development:** In-memory storage with file-backed JSON persistence for profiles and interviews.
- **Production:** PostgreSQL via Neon serverless driver with Drizzle ORM.
- **Schema:** Drizzle ORM defines `users`, `health_checks`, `logs`, `test_results`, and `assets` tables.

### Adapter Pattern Implementation

Core services are defined by port interfaces (e.g., `AuthPort`, `StoragePort`). Implementations are dynamically switched between mock and real services using `config/flags.json`.

### Security Implementation

The middleware stack incorporates Helmet.js for HTTP headers, CORS with an origin allowlist, rate limiting (120 req/min/IP), and request body size limits (200KB).

### Build and Development Workflow

**Development:** Vite development server (port 5173) for the client and Express API (port 5000), with API proxying.
**Production Build:** Client assets are built to `/dist/public`, and the server (via esbuild) to `/dist/index.js`.
**Testing:** A self-test framework (`/scripts/selftest.js`) validates API contracts and features.

## External Dependencies

### Third-Party Services

- **Authentication Service:** (Planned integration via `AuthPort`)
- **Cloud Storage/Database:** (Planned integration via `StoragePort`)
- **Email Delivery Service:** (Planned integration via `EmailPort`)
- **Payment Processor:** (Planned integration via `PaymentsPort`)
- **Cloudinary Video Hosting:** Direct client-side uploads with server-signed URLs for video content and thumbnails. Supports HLS streaming and automatic transcoding.

### Database

- **PostgreSQL:** Used with Neon serverless driver (`@neondatabase/serverless`) and Drizzle ORM. Configured via `DATABASE_URL`.

### UI Component Libraries

- **Shadcn/ui Ecosystem:** Utilizes Radix UI primitives and Tailwind CSS.

### Development Tools

- **Replit-Specific Plugins:** `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (conditional loading).
- **Key NPM Packages:** `express`, `drizzle-orm`, `zod`, `react`, `@tanstack/react-query`, `wouter`, `vite`, `esbuild`, `tsx`, `typescript`, `tailwindcss`.