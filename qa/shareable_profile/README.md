# Shareable Profile Pack v0.1.0

## Overview
The Shareable Profile Pack validates the public profile page with link copying, section toggling, accessibility features, and cross-pack dependency enforcement.

## Test Coverage
- **Contract**: DOM element validation, CSP headers, required UI components (12 selectors)
- **Behavior**: 2 workflows (PR-COPY-LINK, PR-TOGGLE-SECTIONS), responsive testing (mobile/desktop)
- **A11y**: WCAG 2.0 AA compliance, semantic HTML, ARIA attributes, live regions
- **Security**: CSP enforcement, URL token leak detection, PII leak detection
- **Visual**: 1 baseline (profile-default)

## Prerequisite
**REQUIRES**: Subscription status = "active" (enforced via qa/_state/session.json)

If subscription is not active, tests return status "BLOCKED" with reason.

## Key Features
- **Clipboard API**: Copy shareable link with proper permissions in headless Chromium
- **Section Toggles**: Collapsible About and Links sections with ARIA state management
- **Responsive Design**: Mobile (375x812) and desktop (1280x900) viewport testing

## Files
- `/profile_pack/contract.yml`: Test specification
- `/profile_pack/run.py`: Main test runner
- `/profile_pack/helpers.py`: State checking, image diff, test2.html updates
- `/profile_pack/tests_*.py`: Individual test suite implementations

## Test Pages
- `/shareable_profile_test.html`: Main public profile UI

## Execution
```bash
OI_BASE_URL="http://127.0.0.1:5000" PYTHONPATH="." python profile_pack/run.py
```

## Results (v0.1.0)
- Overall: **PASS**
- Contract: **PASS** (12/12 selectors)
- Behavior: **PASS** (clipboard permissions granted, class checks fixed)
- A11y: **PASS**
- Security: **PASS**
- Visual: **PASS** (baseline created)
- Timestamp: 2025-10-11T16:05:31Z

## Technical Notes
- **Clipboard Permissions**: Browser context granted `clipboard-read` and `clipboard-write` permissions for headless testing
- **Class Assertions**: `expect_has_class` uses `state="attached"` to check hidden elements without visibility requirement

## Artifacts
- Test summary: `qa/shareable_profile/v0.1.0/tests.txt`
- Page source: `qa/shareable_profile/v0.1.0/shareable_profile.html.txt`
- Visual baseline: `qa/shareable_profile/v0.1.0/baselines/profile-default.png`
- Test2.html: Automatically updated with version row
