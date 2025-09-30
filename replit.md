# OpenInterview - Module 0 Framework

## Overview

OpenInterview is a modular development framework built on a mock-first architecture that enables rapid prototyping and iterative integration of real services. The application uses an adapter pattern to isolate external dependencies behind stable interfaces, allowing developers to build core functionality locally before swapping in production integrations via feature flags.

This is a full-stack TypeScript application with an Express backend, React frontend, and PostgreSQL database. The system is designed for the "replit-deployment model" - build and validate core features using mocks, then progressively replace them with real implementations through configuration changes rather than code rewrites.

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
- Development: In-memory storage (`MemStorage` class) for zero-dependency local development
- Production: PostgreSQL via Neon serverless (configured via `DATABASE_URL`)
- Migration path: Drizzle Kit for schema migrations in `/migrations` directory

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
- Self-test framework (`/scripts/selftest.ts`) validates API contracts and build process
- Outputs machine-parsable JSON (`/logs/selftest.json`) and human-readable logs
- Health check endpoints provide real-time system validation

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