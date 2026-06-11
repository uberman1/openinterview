# Profiles Test Pack

**Version:** v0.1.0  
**Pack ID:** profiles  
**Page:** `/profiles_test.html`  
**Test Runner:** `PYTHONPATH=. python profiles_pack/run.py`

## Overview

The Profiles Pack validates table visibility regression guards and core CRUD workflows for the profiles management interface. This pack specifically addresses the "table disappears after hydration" bug and ensures consistent table visibility across different load scenarios.

## Test Coverage

### Contract Tests (14 selectors)
- Main content structure (`main#content`)
- Page heading (`#page_h1`)
- Assertive error region (`#errors[role='alert'][aria-live='assertive']`)
- Profiles container (`#profiles_container`)
- Profiles table (`table#profiles_table`)
- Table body (`tbody#profiles_tbody`)
- New profile button (`#new_profile_btn`)
- Profile form (`form#profile_form`)
- Form inputs (`#name`, `#role`)
- Form actions (`#save_btn`, `#publish_btn`)
- Polite status region (`#form_status[role='status']`)
- Back link (`a#back_to_home`)

### Behavior Tests (3 workflows)
1. **PF-LIST-VISIBLE-AFTER-LOAD**: Table visible after initial load
   - Visit page
   - Wait for table (4s timeout)
   - Assert table is visible
   - Verify at least 1 row exists

2. **PF-CREATE-SAVE-PUBLISH**: Form submission workflow
   - Visit page
   - Fill name: "Ava Trent"
   - Fill role: "Data Scientist"
   - Click Save → verify "Saved" status
   - Click Publish → verify "Published" status

3. **PF-NO-DISAPPEAR-POST-HYDRATE**: Post-hydration stability guard
   - Visit page
   - Wait for table (4s timeout)
   - Sleep 800ms (allow hydration)
   - Assert table still visible

**Additional Checks:**
- Console error tracking (0 errors expected)
- Responsive validation (mobile 375x812, desktop 1280x900)

### A11y Tests
- Semantic HTML structure (`main#content`)
- Assertive live region for errors (`role="alert"`, `aria-live="assertive"`)
- Polite live region for status updates (`role="status"`, `aria-live="polite"`)
- Table caption for screen readers

### Security Tests
- CSP header presence (meta or HTTP header)
- URL token leak detection
- Email PII leak detection

### Visual Tests (1 baseline)
- **profiles-default**: Full page screenshot (1280x900, main selector)
- Threshold: 0.001 pixel difference tolerance

## Prerequisites

**Cross-Pack Dependency:**
- Subscription Pack state: `subscription.status === "active"`
- Location: `qa/_state/session.json`
- If not met: Tests return `BLOCKED` status

## Installation

```bash
# From repository root
pip install -r profiles_pack/requirements.txt
python -m playwright install --with-deps chromium
```

## Running Tests

```bash
# Default (localhost:5000)
PYTHONPATH=. python profiles_pack/run.py

# Custom base URL
OI_BASE_URL="https://your-preview-domain" PYTHONPATH=. python profiles_pack/run.py
```

## Output Artifacts

All artifacts stored in `qa/profiles/v0.1.0/`:

- `tests.txt` - Human-readable test summary
- `tests.json` - Machine-parsable rollup
- `contract.json/txt` - DOM selector validation results
- `behavior.json/txt` - Workflow execution logs with console errors
- `a11y.json/txt` - Accessibility validation results
- `security.json/txt` - Security check results
- `visual.json/txt` - Visual regression comparison
- `baselines/profiles-default.png` - Visual baseline screenshot
- `profiles.html.txt` - Page source snapshot

## E2E State Management

After successful test run, updates `qa/_state/session.json` with:

```json
{
  "profiles": {
    "profile_count": 2,
    "last_created": {
      "name": "Ava Trent",
      "role": "Data Scientist",
      "status": "Published",
      "created_at": "2025-10-11T16:34:40Z"
    },
    "table_visible": true,
    "workflows_validated": [
      "PF-LIST-VISIBLE-AFTER-LOAD",
      "PF-CREATE-SAVE-PUBLISH",
      "PF-NO-DISAPPEAR-POST-HYDRATE"
    ]
  }
}
```

## Key Features

### Regression Guards
The pack specifically prevents the "table disappears after load" bug through:
1. Explicit visibility protection in JavaScript (`protectVisibility()`)
2. Multiple event listeners (visibilitychange, focus, pageshow)
3. MutationObserver to catch DOM changes
4. Post-hydration delay test (800ms wait)

### Console Error Tracking
All browser console errors captured during workflow execution. Zero tolerance for errors ensures clean JavaScript execution.

### Visual Baselines
First run creates baseline at `baselines/profiles-default.png`. Subsequent runs compare against baseline with 0.1% pixel difference threshold.

## Pass Criteria

**Overall PASS requires:**
- Contract: All 14 selectors present
- Behavior: All 3 workflows complete successfully, 0 console errors, responsive on both viewports
- A11y: All 3 landmark/live region checks pass
- Security: CSP present, no token/email leaks
- Visual: Diff ratio ≤ 0.001 or baseline created (WARN status acceptable)

**BLOCKED status:**
- Subscription not active in E2E state

**FAIL status:**
- Any workflow assertion fails
- Console errors detected
- DOM selectors missing
- Security issues found
- Visual diff exceeds threshold

## Version History

### v0.1.0 (2025-10-11)
- Initial release
- 3 workflows: visibility guards + CRUD flow
- Console error tracking
- Subscription prerequisite enforcement
- 1 visual baseline
- Cross-pack E2E state coordination

## Related Packs

**Upstream Dependencies:**
- Subscription Pack v0.1.0+ (active subscription required)

**Downstream Consumers:**
- None currently

**Parallel Packs:**
- Password Pack v0.1.6
- Availability Pack v0.1.0
- Shareable Profile Pack v0.1.0

## Technical Notes

**Chromium Path:**
- System Chromium: `/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium`
- Configured in `run.py` for consistent headless testing

**Clipboard Permissions:**
- Not required for this pack (form-only workflows)

**Helper Functions:**
- `diff_images()`: PIL-based pixel diff with ratio calculation
- `prereq_subscription_active()`: Cross-pack state validation
- `append_row_to_test_index()`: Auto-updates `public/test2.html` with test results

## Troubleshooting

**BLOCKED status:**
```bash
# Run subscription pack first
PYTHONPATH=. python subscription_pack/run.py
```

**Visual diff failures:**
```bash
# Regenerate baseline
rm qa/profiles/v0.1.0/baselines/profiles-default.png
PYTHONPATH=. python profiles_pack/run.py
```

**ModuleNotFoundError:**
```bash
# Ensure PYTHONPATH is set
PYTHONPATH=. python profiles_pack/run.py
```

**Table not visible:**
- Check browser console in `behavior.json` for JavaScript errors
- Verify `protectVisibility()` function is executing
- Inspect `profiles_test.html` inline styles

## Contact

For issues or questions about this test pack, refer to the main QA documentation at `qa/README.md`.
