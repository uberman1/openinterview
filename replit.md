# OpenInterview - Module 0 Framework

## Overview

OpenInterview is a modular development framework designed for rapid prototyping and iterative integration, utilizing a mock-first architecture. It's a full-stack TypeScript application with an Express backend, React frontend, and PostgreSQL database. The primary goal is to enable developers to build and validate features with local mocks, then seamlessly transition to production integrations using feature flags, following a "replit-deployment model" that prioritizes configuration over code changes. The project aims to be a robust, scalable platform for interview management, built with modern web technologies and a clear separation of concerns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The project employs a monorepo structure with `/server` (Express API), `/client` (React SPA), `/shared` (common types/schemas), `/adapters` (port interfaces), `/mocks` (stub implementations), and `/config` (feature flags).

### Frontend Architecture

**Technology Stack:** React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui (Radix UI, Tailwind CSS).
**Design Patterns:** Component-based architecture, custom hooks, and an API client abstraction.
**Key Features:** Dark theme, responsive design, real-time data refresh, and a multi-page dashboard.

### Backend Architecture

**Technology Stack:** Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL.
**Design Patterns:** Adapter/Port pattern for external service isolation, middleware-based processing, and RESTful API design (`/api/v1`).
**Core Services:** Health monitoring, structured logging, self-test framework, and adapter registry.
**Key Features:** Admin console for feature flag management and analytics, authentication (including passwordless OTP), graceful shutdown, static file serving with caching, and robust API error handling.
**Core Workflow:** Manages interview scheduling, status transitions (draft, scheduled, completed, canceled) with validation, search, and filtering.

### Data Storage

**Strategy:**
- **Development:** In-memory storage with file-backed persistence for profiles and interviews using JSON files, supporting search and cursor-based pagination.
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

### UI/UX Decisions

The UI adopts a dark theme and responsive design using Shadcn/ui, which leverages Radix UI primitives and Tailwind CSS for accessible and styled components. The system features a multi-page dashboard.

### Technical Implementations

The system utilizes a "replit-deployment model" for configuration-over-code integration. A hybrid approach serves `/profile/:id` to load all necessary scripts for both view and edit capabilities, providing a view-first UX for new profiles. Key components like `data-store.js`, `asset-library.js`, and `profile-editor.js` enable features like profile creation, inline editing, and asset management.

### Feature Specifications

- **Profile Management:** View-first profile creation, inline editing, saving, clearing, and persistence of phone/email fields.
- **Navigation:** Consistent navigation menu across all pages, dynamically updated via `nav-patch.js`.
- **File Uploads:** Persistence of uploaded resumes and attachments with correct ordering.
- **Interview Workflow:** Guardrailed self-deploy package for new interview workflow with profile creation, inline editing, and asset library.
- **Downloads Page:** `downloads.html` for accessing application packages (current version and complete package) and documentation.
- **UI Consistency:** Standardized header formatting, avatar display, and spacing across all pages.

### System Design Choices

A mock-first architecture is central, allowing for rapid prototyping and seamless transition to production integrations via feature flags. The system prioritizes a clear separation of concerns with its monorepo structure and adapter pattern. Robust error handling and a self-test framework are integrated for reliability.

## External Dependencies

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