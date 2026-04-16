# Home Test Pack

**Version:** v0.1.0  
**Pack ID:** home  
**Page:** `/home_test.html`  
**Test Runner:** `PYTHONPATH=. python home_pack/run.py`

## Overview

The Home Pack provides a QA surface for the OpenInterview home page with system readiness diagnostics and navigation testing. It validates the home page's ability to aggregate E2E state from all feature areas and provide clear navigation to test pages.

## Test Coverage

### Contract Tests (9 selectors)
- Main content (`#content`)
- System readiness indicator (`#system_ready`)
- Diagnostics button (`#run_diag`)
- Navigation links:
  - Password reset (`#nav_password`)
  - Subscription (`#nav_subscription`)
  - Availability (`#nav_availability`)
  - Profiles (`#nav_profiles`)
  - Shareable profile (`#nav_shareable`)
  - Uploads (`#nav_uploads`)

### Security Tests
- **CSP Validation**: Meta CSP header present
- **Content Security**: Proper script/style/image policies

### A11y Tests
- **Live Region**: `#system_ready` with `role="status"` and `aria-live="polite"`
- **Semantic Structure**: Main content landmark (`#content`)
- **Status Updates**: Readiness indicator accessible to screen readers

### Behavior Tests (2 workflows)

#### 1. Readiness Diagnostics
- Click "Run diagnostics" button
- Verify readiness label ("System Ready" or "Not Ready")
- Aggregates state from 6 feature areas:
  - Password reset
  - Subscription
  - Availability
  - Profiles
  - Shareable profile
  - Uploads

#### 2. Navigation Smoke Test
- Verify all 6 navigation links have correct href attributes
- Links to:
  - `/password_reset.html`
  - `/subscription_test.html`
  - `/availability_test.html`
  - `/profiles_test.html`
  - `/shareable_profile_test.html`
  - `/uploads_test.html`

### Visual Tests (1 baseline)
- **home-default**: Full page screenshot at initial state
- Viewport: Default (desktop)
- Format: PNG

## Features Validated

### System Readiness Banner
- **State Aggregation**: Reads from `qa/_state/session.json` mirrored to localStorage
- **Status Logic**: 
  - All 6 areas must pass for "System Ready"
  - Shows "Not Ready" if any area incomplete
- **Live Updates**: Status updates on diagnostics run

### Navigation Hub
- **Feature Access**: Direct links to all 6 test pages
- **Accessibility**: Proper nav landmark with aria-label
- **Visual Design**: Consistent with OpenInterview theme

### Details Panel
- **State Inspector**: Shows raw E2E state and check results
- **Developer Tool**: JSON view of system status
- **Debug Aid**: Helps identify which areas need attention

## E2E State Dependencies

Reads from `qa/_state/session.json`:
```json
{
  "password_reset": {"status": "completed"},
  "subscription": {"status": "active"},
  "availability": {"booking_count": 1},
  "profiles": {"profile_count": 1},
  "shareable_profile": {"link_copied": true},
  "uploads": {"upload_count": 1}
}
```

**Readiness Logic:**
- Password: `password_reset.status === 'completed'` OR `security.reset === true`
- Subscription: `subscription.status === 'active'`
- Availability: `availability.booking_count >= 1`
- Profiles: `profiles.profile_count >= 1`
- Shareable Profile: `shareable_profile.link_copied === true`
- Uploads: `uploads.upload_count >= 1`

## Installation & Usage

### Prerequisites
```bash
pip install -r home_pack/requirements.txt
python -m playwright install --with-deps chromium
```

### Run Tests
```bash
# Default (localhost:8000)
PYTHONPATH=. python home_pack/run.py

# Custom base URL
OI_BASE_URL="https://your-preview-domain.replit.app" PYTHONPATH=. python home_pack/run.py
```

### Expected Output
```json
{
  "status": "PASS",
  "suites": [
    {"contract": "PASS", "count": 9},
    {"security": "PASS"},
    {"a11y": "PASS"},
    {"behavior-readiness": "PASS", "label": "System Ready"},
    {"behavior-nav-hrefs": "PASS", "count": 6},
    {"visual": "PASS", "baseline": "home-default.png"}
  ]
}
```

## Output Artifacts

**Test Results:**
- `qa/home/v0.1.0/tests.txt` - Human-readable summary
- `qa/home/v0.1.0/tests.json` - Machine-parsable results

**Visual Baselines:**
- `qa/home/v0.1.0/baselines/home-default.png` - Initial page state

**Source Snapshot:**
- `qa/home/v0.1.0/home.html.txt` - Page source marker

**Test Index:**
- Updates `public/test2.html` section `#Home` with v0.1.0 row

## Failure Scenarios

**Contract Failures:**
- Missing required DOM elements
- Timeout waiting for selectors (4s)

**Security Failures:**
- CSP header missing from page

**A11y Failures:**
- Missing `role="status"` on readiness indicator
- Main content landmark not visible

**Behavior Failures:**
- Readiness label shows unexpected text
- Navigation hrefs don't match expected paths

**Visual Failures:**
- Screenshot generation errors

## Version History

### v0.1.0 (2025-10-11)
- Initial release
- 6 test suites: contract, security, a11y, readiness, navigation, visual
- System readiness aggregation from 6 feature areas
- Navigation smoke test for all test pages
- 1 visual baseline
- Auto-updates test2.html with results

## Related Packs

**Dependencies:**
- Reads E2E state from `qa/_state/session.json` (shared across all packs)
- Navigation links reference: Password, Subscription, Availability, Profiles, Shareable Profile, Uploads

**Integration:**
- Home serves as central hub for all test packs
- Readiness banner reflects completion status across entire QA suite
- No data modifications (read-only integration)

## Maintainer Notes

- Home pack is unique: it aggregates state but doesn't modify it
- Keep navigation hrefs in sync with actual test page paths
- Update readiness logic when new feature areas are added
- Visual baseline should be regenerated if layout changes significantly
