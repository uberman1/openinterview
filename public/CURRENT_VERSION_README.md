# OpenInterview - Current Version Package

## 📦 Package Information

**Version**: v1.0.0 - Current Production Build  
**Release Date**: October 17, 2025  
**Package Size**: 66 KB  
**Total Files**: 47 essential files  

This is a clean, streamlined package containing only the current production files without backups, tests, or legacy versions.

## 📂 What's Included

### HTML Pages (10 files)
- `home.html` - Main dashboard
- `login.html` - Login page
- `password.html` - Password management
- `subscription.html` - Subscription settings
- `availability.html` - Availability editor
- `profiles.html` - Profile management
- `profile_edit.html` - Profile editor
- `public_profile.html` - Public profile view
- `downloads.html` - Downloads page
- `uploads.html` - File uploads

### JavaScript Modules (27 files)
**Core Workflow:**
- `data-store.js` - LocalStorage data management
- `asset-library.js` - File picker and assets
- `profile-editor.js` - Inline profile editing
- `home-bindings.js` - Workflow integration
- `availability.js` - Availability scheduling

**Navigation & UI:**
- `nav-patch.js` - Navigation unification
- `home.links.bind.js` - Dynamic link binding
- `header.avatar.bind.js` - Avatar management
- `redirect-shim.js` - Page redirects

**Feature Scripts:**
- `home.bind.js` - Home page features
- `uploads.bind.js` - File uploads
- `subscription.bind.js` - Subscription
- `password.bind.js` - Password features
- `profiles.bind.js` - Profile management
- `public_profile.book.bind.js` - Booking

**And more utility scripts...**

### Configuration & Data (5 files)
- `package.json` - Dependencies
- `index.js` - Server file
- `replit.md` - Documentation
- `README.md` - Project overview
- `public/css/theme.css` - Styles

### Profile Template (2 files)
- `profile_v4_1_package/public/index.html`
- `profile_v4_1_package/public/app.js`

### Data Files (3 files)
- `public/data/profiles.json`
- `public/data/original_profiles.json`
- `public/data/versions.json`

## 🚀 Quick Start

### 1. Extract the Package
```bash
tar -xzf openinterview-current-version.tar.gz
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment
Create a `.env` file:
```env
SESSION_SECRET=your-secret-key-here
DATABASE_URL=your-database-url-here
NODE_ENV=development
```

### 4. Run the Application
```bash
npm run dev
```

Server runs on: http://localhost:5000

## 📋 File Structure

```
openinterview-current-version/
├── public/
│   ├── *.html              # 10 HTML pages
│   ├── js/                 # 27 JavaScript modules
│   ├── css/                # Styles
│   ├── data/               # JSON data files
│   └── profile_v4_1_package/
│       └── public/         # Profile template
├── package.json
├── index.js
├── replit.md
└── README.md
```

## ✨ Key Features

- ✅ New Interview Workflow with profile creation
- ✅ Inline profile editing
- ✅ Asset library management
- ✅ Calendly-style availability scheduling
- ✅ File uploads with localStorage persistence
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Guardrails-protected deployment

## 🔧 What's NOT Included

To keep this package clean and lightweight, we excluded:
- ❌ Old/previous versions (*_prev.html)
- ❌ Backup files (*.bak)
- ❌ Test files
- ❌ User uploaded files
- ❌ Node modules (install via npm)
- ❌ Build artifacts
- ❌ Legacy code

## 📖 Documentation

All pages are fully documented in `replit.md`, including:
- System architecture
- Recent changes log
- User preferences
- External dependencies
- Development workflow

## 🔐 Production Ready

This package contains only production-ready files:
- All pages tested with Playwright e2e tests ✅
- Architect reviewed and approved ✅
- Clean, maintainable codebase ✅
- No legacy or deprecated code ✅

## 📞 Support

For detailed setup instructions, see the main application README.md included in this package.

---

**Current Version Package** - Streamlined for production deployment
