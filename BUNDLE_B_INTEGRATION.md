# Bundle B v0.2.0 - UI Quality Gate Integration

## Overview

Bundle B v0.2.0 introduces a comprehensive UI Quality Gate with Playwright-based automated testing covering accessibility, performance, responsive design, and error state handling. This complements Bundle A's API-focused testing to provide full-stack quality assurance.

## ✅ Test Coverage

### 1. Accessibility Smoke Tests (`a11y_smoke.py`)
**Validates ARIA landmarks and semantic HTML across all test pages:**

| Page | Checks |
|------|--------|
| `/home_test.html` | `<main role="main">`, `[role=status][aria-live=polite]` |
| `/password_reset.html` | `<form>`, `<label>`, `<button>` |
| `/subscription_test.html` | `[data-plan]`, `<button>` |
| `/availability_test.html` | `[data-slot]`, `<button>` |
| `/shareable_profile_test.html` | `#copy_link_btn`, `[aria-expanded]` |
| `/profiles_test.html` | `<table>`, `<button>` |
| `/uploads_test.html` | `input[type=file]`, `[role=status]` |

**Purpose:** Ensures accessible navigation, screen reader compatibility, and proper semantic structure.

### 2. Performance Smoke Tests (`perf_smoke.py`)
**Measures page load metrics with lenient thresholds:**

- **DOMContentLoaded:** < 2500ms
- **Load Event:** < 3500ms

**Tested Pages:**
- All 7 test pages (home, password reset, subscription, availability, shareable profile, profiles, uploads)

**Purpose:** Catches performance regressions early, ensures acceptable load times.

### 3. Responsive Layout Tests (`responsive_smoke.py`)
**Validates responsive design across viewports:**

- **Mobile:** 375x812 (iPhone X)
- **Desktop:** 1280x900

**Check:** No horizontal overflow (scrollWidth ≤ innerWidth + 2% tolerance)

**Purpose:** Ensures layouts adapt properly without horizontal scrolling.

### 4. Error State Smoke Tests (`error_state_smoke.py`)
**Validates error handling and user feedback:**

- Simulates "API not ready" state via localStorage flags
- Checks for "not ready" or "system not ready" messaging
- Validates graceful degradation

**Purpose:** Ensures users receive clear feedback when backend services are unavailable.

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
pip install -r bundle_b/requirements.txt
python -m playwright install --with-deps chromium
```

### Method 1: Standalone Execution

**Start your server** (serving `public/` at http://127.0.0.1:8000):
```bash
# Option A: Node.js server
npm run dev

# Option B: Python static server
python -m http.server 8000 --directory public
```

**Run Bundle B tests:**
```bash
PYTHONPATH=. python bundle_b/run_bundle_b_tests.py
```

**Output artifacts:**
- `qa/bundle_b/v0.2.0/tests.json` - Full test results

### Method 2: Via Release Gate

```bash
# Ensure server is running, then:
PYTHONPATH=. python release_gate/run_all.py
```

Bundle B runs automatically as the 11th pack in the release gate.

### Method 3: Update Infrastructure Table

```bash
python scripts/update_test2_index_bundle_b.py
```

Adds Bundle B entry to `public/test2.html` Quality Gate – UI table.

## 📊 Expected Output

### Success Case
```json
{
  "bundle_b_ui_quality_v0_2_0": {
    "bundle_b.tests_ui.a11y_smoke": {
      "status": "PASS"
    },
    "bundle_b.tests_ui.perf_smoke": {
      "status": "PASS",
      "thresholds": {
        "dcl": 2500,
        "load": 3500
      }
    },
    "bundle_b.tests_ui.responsive_smoke": {
      "status": "PASS"
    },
    "bundle_b.tests_ui.error_state_smoke": {
      "status": "PASS"
    }
  },
  "timestamp": "2025-10-12T01:30:00Z",
  "base_url": "http://127.0.0.1:8000",
  "status": "PASS"
}
```

### Failure Case
```json
{
  "bundle_b_ui_quality_v0_2_0": {
    "bundle_b.tests_ui.a11y_smoke": {
      "status": "FAIL",
      "page": "/home_test.html",
      "missing": "css=main[role=main]"
    },
    ...
  },
  "status": "FAIL"
}
```

## 🔧 Configuration

### Environment Variables

- `OI_BASE_URL` - Base URL for tests (default: `http://127.0.0.1:8000`)

### Performance Thresholds

Edit `bundle_b/tests_ui/perf_smoke.py`:
```python
MAX_DCL = 2500   # DOMContentLoaded threshold (ms)
MAX_LOAD = 3500  # Load event threshold (ms)
```

### Responsive Viewports

Edit `bundle_b/tests_ui/responsive_smoke.py`:
```python
VIEWPORTS = [
    (375, 812),   # Mobile (iPhone X)
    (1280, 900),  # Desktop
    # Add more viewports here
]
```

## 📁 File Structure

```
bundle_b/
├── tests_ui/
│   ├── __init__.py
│   ├── a11y_smoke.py           # Accessibility tests
│   ├── perf_smoke.py           # Performance tests
│   ├── responsive_smoke.py     # Responsive layout tests
│   └── error_state_smoke.py    # Error handling tests
├── run_bundle_b_tests.py       # Main test orchestrator
├── requirements.txt            # Python dependencies
└── README.md                   # Quick reference

qa/bundle_b/v0.2.0/
└── tests.json                  # Test results

scripts/
└── update_test2_index_bundle_b.py  # Infrastructure tracker

ci/snippets/
└── bundle_b_quality_gate.yml   # GitHub Actions snippet

release_gate/
└── run_all.py                  # UPDATED: Bundle B added
```

## 🎯 CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
- name: Install Bundle B dependencies
  run: |
    pip install -r bundle_b/requirements.txt
    python -m playwright install --with-deps chromium

- name: Start Server
  run: |
    npm run dev &
    sleep 5

- name: Run Bundle B Tests
  run: |
    PYTHONPATH=. python bundle_b/run_bundle_b_tests.py

- name: Upload Results
  uses: actions/upload-artifact@v4
  with:
    name: bundle-b-v0-2-0-results
    path: qa/bundle_b/v0.2.0/tests.json
```

Or use: `ci/snippets/bundle_b_quality_gate.yml`

## 🐛 Troubleshooting

### Playwright Installation Issues
```bash
# Reinstall Playwright with system dependencies
python -m playwright install --with-deps chromium
```

### Server Not Running
```bash
# Check if port 8000 is in use
lsof -i :8000

# Start server manually
python -m http.server 8000 --directory public
```

### Test Failures

**Accessibility failures:**
- Verify HTML structure includes required ARIA attributes
- Check that semantic elements (`<main>`, `<form>`, etc.) are present

**Performance failures:**
- Increase thresholds if running on slower hardware
- Optimize page resources (images, scripts)

**Responsive failures:**
- Check for fixed-width elements
- Verify CSS uses responsive units (%, vw, rem)

**Error state failures:**
- Ensure error messaging text matches expected patterns
- Check localStorage flag handling in application code

## 📋 Test Page Requirements

For Bundle B tests to pass, each test page must include:

### Accessibility Requirements
- Semantic HTML5 elements (`<main>`, `<form>`, `<button>`, `<label>`)
- ARIA landmarks (`role="main"`, `role="status"`)
- ARIA live regions for dynamic content
- Proper form labeling

### Performance Requirements
- Optimized images and assets
- Minified CSS/JS in production
- DOMContentLoaded < 2.5s, Load < 3.5s

### Responsive Requirements
- Mobile-first CSS
- No horizontal overflow
- Flexible layouts using Grid/Flexbox

### Error State Requirements
- Graceful handling of API failures
- User-friendly error messages
- Support for localStorage-based test flags

## 🔄 Integration with Bundle A

Bundle B complements Bundle A v0.2.0:

| Aspect | Bundle A (API) | Bundle B (UI) |
|--------|---------------|---------------|
| **Focus** | Backend APIs | Frontend UI |
| **Tool** | requests library | Playwright |
| **Tests** | Security, Stripe, Email | A11y, Perf, Responsive, Errors |
| **Runtime** | HTTP only | Browser automation |
| **Speed** | Fast (~10s) | Moderate (~30s) |

**Combined Coverage:** Full-stack quality assurance from API contracts to user experience.

## ✅ Verification Checklist

- [x] Accessibility tests for all 7 pages
- [x] Performance thresholds configured
- [x] Responsive layout checks (mobile + desktop)
- [x] Error state simulation
- [x] Release gate integration
- [x] test2.html infrastructure tracking
- [x] CI/CD snippet provided
- [x] Documentation complete

## 🚀 Next Steps

1. **Run Tests:** Execute Bundle B against your application
2. **Review Results:** Check `qa/bundle_b/v0.2.0/tests.json`
3. **Fix Issues:** Address any accessibility, performance, or responsive failures
4. **Automate:** Integrate into CI/CD pipeline
5. **Monitor:** Track quality metrics over time

**Bundle B v0.2.0 ensures your UI meets quality standards for accessibility, performance, and user experience!** 🎨
