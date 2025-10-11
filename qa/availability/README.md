# Availability Pack v0.1.0

## Overview
The Availability Pack validates the calendar/scheduling UI, slot selection, booking flows, and cross-pack dependency enforcement.

## Test Coverage
- **Contract**: DOM element validation, CSP headers, required UI components
- **Behavior**: 2 workflows (AV-BOOK-HAPPY, AV-CANCEL), responsive testing
- **A11y**: WCAG 2.0 AA compliance, semantic HTML, ARIA attributes
- **Security**: CSP enforcement, PII leak detection
- **Visual**: 3 baselines (slots-default, success-default, canceled-default)

## Prerequisite
**REQUIRES**: Subscription status = "active" (enforced via qa/_state/session.json)

If subscription is not active, tests return status "BLOCKED" with reason.

## Files
- `/availability_pack/contract.yml`: Test specification
- `/availability_pack/run.py`: Main test runner
- `/availability_pack/helpers.py`: State checking, image diff, test2.html updates
- `/availability_pack/tests_*.py`: Individual test suite implementations

## Test Pages
- `/availability_test.html`: Main booking UI
- `/availability/success.html`: Confirmation page
- `/availability/canceled.html`: Cancellation page

## Execution
```bash
OI_BASE_URL="http://127.0.0.1:5000" PYTHONPATH="." python availability_pack/run.py
```

## Results (v0.1.0)
- Overall: **PASS**
- Contract: **PASS**
- Behavior: **PASS** (prerequisite satisfied)
- A11y: **PASS**
- Security: **PASS**
- Visual: **PASS** (baselines created)
- Timestamp: 2025-10-11T15:46:08Z

## Artifacts
- Test summary: `qa/availability/v0.1.0/tests.txt`
- Page source: `qa/availability/v0.1.0/availability.html.txt`
- Visual baselines: `qa/availability/v0.1.0/baselines/*.png`
- Test2.html: Automatically updated with version row
