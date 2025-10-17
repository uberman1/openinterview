# OpenInterview Application - Complete Download Package

## 📦 What's Included

This package contains the complete OpenInterview application with all code, pages, and configurations.

### Archive File
- **Filename**: `openinterview-application.tar.gz`
- **Size**: ~450 KB
- **Format**: Compressed TAR archive

## 📂 Package Contents

### Core Application Files

**Frontend Pages** (`public/`)
- `home.html` - Main dashboard
- `login.html` - Login page
- `password.html` - Password management
- `subscription.html` - Subscription page
- `availability.html` - Availability editor
- `profiles.html` - Profile management
- `profile_edit.html` - Profile editor
- `public_profile.html` - Public profile view
- `booking_manage.html` - Booking management

**JavaScript Modules** (`public/js/`)
- `data-store.js` - LocalStorage wrapper for profiles/assets
- `asset-library.js` - File picker and asset management
- `home-bindings.js` - Home page bindings with workflow integration
- `profile-editor.js` - Inline profile editing
- `availability.js` - Availability slot management
- `nav-patch.js` - Navigation unification
- `home.links.bind.js` - Dynamic link binding
- And 20+ other utility scripts

**Backend** (`server/`, `client/`, `shared/`)
- Express server setup
- React frontend components
- Shared TypeScript schemas
- API routes and middleware

**Configuration Files**
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind CSS
- `drizzle.config.ts` - Database ORM

**Deployment Scripts** (`scripts/`)
- `deploy.mjs` - Guardrailed deployment
- `selftest.mjs` - Testing utilities

**Test Suite** (`tests/`)
- Playwright e2e tests
- Unit tests
- Integration tests

## 🚀 How to Extract and Use

### 1. Extract the Archive

**On Mac/Linux:**
```bash
tar -xzf openinterview-application.tar.gz
cd openinterview-application
```

**On Windows (using Git Bash or WSL):**
```bash
tar -xzf openinterview-application.tar.gz
cd openinterview-application
```

**On Windows (using 7-Zip or WinRAR):**
- Right-click the `.tar.gz` file
- Select "Extract Here" or "Extract to openinterview-application/"

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
SESSION_SECRET=your-secret-key-here
DATABASE_URL=your-database-url-here
NODE_ENV=development
```

### 4. Run the Application

**Development Mode:**
```bash
npm run dev
```

This starts:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

**Production Build:**
```bash
npm run build
npm start
```

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (via Neon serverless)
- **Styling**: Tailwind CSS, Radix UI

### Key Features
- ✅ Mock-first development with adapter pattern
- ✅ LocalStorage-based file persistence
- ✅ Profile creation and inline editing
- ✅ Calendly-style availability scheduling
- ✅ Asset library management
- ✅ Guardrails-protected deployment system
- ✅ Dark mode support
- ✅ Responsive design

### Project Structure

```
openinterview-application/
├── public/              # Static HTML pages and assets
│   ├── js/             # Frontend JavaScript modules
│   ├── css/            # Stylesheets
│   ├── uploads/        # User uploads
│   └── *.html          # Application pages
├── client/             # React SPA source
├── server/             # Express API backend
├── shared/             # Shared TypeScript types/schemas
├── adapters/           # Port interfaces
├── mocks/              # Mock implementations
├── config/             # Feature flags
├── scripts/            # Deployment and utilities
├── tests/              # Test suite
└── package.json        # Dependencies
```

## 📋 Important Files

### Configuration
- `package.json` - All npm dependencies
- `tsconfig.json` - TypeScript settings
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Design system

### Documentation
- `replit.md` - Full system documentation
- `README.md` - Project overview
- `DOWNLOAD_PACKAGE_README.md` - This file

### Protected Files (Guardrails)
These files are protected by the guardrails system:
- `public/home.html`
- `public/profile_v4_1_package/public/index.html`
- `public/js/nav-patch.js`
- `public/js/redirect-shim.js`

## 🔧 Development Workflow

### New Interview Workflow
1. Click "Create New" on home page
2. System creates draft profile in localStorage
3. Opens profile editor at `/profile/new?id={profileId}`
4. Edit profile inline (name, title, bio, etc.)
5. Manage availability and assets
6. Save to publish profile

### Data Storage
- **Development**: LocalStorage + file-backed JSON
  - Keys: `oi:profiles:{id}`, `oi:assets:{type}:{id}`
  - Files: `public/data/profiles.json`
- **Production**: PostgreSQL via Drizzle ORM

### Testing
```bash
# Run all tests
npm test

# Run Playwright e2e tests
npm run test:e2e

# Run self-test framework
npm run selftest
```

## 🔐 Security Features
- Helmet.js for HTTP headers
- CORS with origin allowlist
- Rate limiting (120 req/min/IP)
- Request body size limits (200KB)
- Session management with SESSION_SECRET

## 🚢 Deployment

### Replit Deployment
The application is configured for Replit deployment with:
- Auto-restart workflows
- Built-in PostgreSQL database
- One-click publishing

### Manual Deployment
1. Build the application: `npm run build`
2. Set environment variables
3. Start the server: `npm start`
4. Application runs on port 5000

## 📞 Support

For issues or questions:
1. Check `replit.md` for architecture details
2. Review test files in `tests/` for usage examples
3. Examine existing components for patterns

## 📄 License

This is a proprietary application for OpenInterview.

---

**Version**: October 17, 2025
**Package Created**: Includes all recent fixes and New Interview Workflow
