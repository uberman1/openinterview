# Stage 5 — Pilot & UAT (v0.5.0)

## Overview

Stage 5 is a **Pilot and User Acceptance Testing (UAT) quality gate** that facilitates real user testing with structured feedback capture. It validates prerequisites, optionally checks system health, and provides a web-based hub for collecting tester feedback.

## What It Validates

### 1. Prerequisite Artifacts
- **Bundles A/B/C**: Validates that artifacts from previous quality gates exist
- **Paths Checked**:
  - `qa/bundle_a/v0.2.0/`
  - `qa/bundle_b/v0.2.0/`
  - `qa/bundle_c/v0.2.0/`
- **Purpose**: Ensures UAT runs after security, UI, and governance validation

### 2. Health Check (Optional)
- **Endpoint**: Configured via `HEALTH_URL` environment variable
- **Expected Response**: JSON with `"status":"ok"` or `"healthy":true` or `"ok":true`
- **Enforcement**: Only fails gate when `EXPECT_LIVE=1`
- **Purpose**: Validates system is operational for UAT

### 3. UAT Feedback Tracking
- **Location**: `qa/stage5/feedback/`
- **Format**: Individual JSON files per feedback entry
- **Count**: Reports number of feedback entries collected
- **Purpose**: Track UAT participation and coverage

## UAT Hub

### Overview

The UAT Hub (`/uat_hub.html`) is a standalone HTML page for collecting structured feedback from real users during pilot/UAT testing.

### Features

**Feedback Form Fields:**
- **Tester**: Name or initials
- **Feature**: Dropdown of application features
- **Flow**: Specific user flow tested (e.g., "SUB-BUY-PRO")
- **Rating**: Experience rating (1-5 scale)
- **Notes**: Free-form feedback (bugs, UX issues, suggestions)

**Storage:**
- **Client-side**: Saved to browser localStorage
- **Key**: `uat_feedback_entries`
- **Format**: JSON array of feedback objects
- **Privacy**: Nothing sent offsite, all local

**Security:**
- CSP header enforced
- No external connections
- ARIA accessible
- Mobile responsive

### Workflow

**1. Tester Experience:**
```
1. Open /uat_hub.html
2. Fill out feedback form
3. Click "Save Feedback"
4. Confirmation message shown
5. Continue testing other features
```

**2. QA/Dev Export:**
```bash
# Export localStorage data to files
python stage5/export_feedback.py

# Review individual entries
ls -la qa/stage5/feedback/
cat qa/stage5/feedback/entry_1_*.json
```

**3. Analysis:**
- Review all feedback entries
- Identify common issues
- Prioritize fixes
- Track UAT coverage

## Environment Variables

| Variable | Description | Default | Production |
|----------|-------------|---------|------------|
| `HEALTH_URL` | Health endpoint URL | - | Set if health check needed |
| `EXPECT_LIVE` | Require healthy backend | `0` | `1` for strict mode |

## Usage

### Local/Development UAT

**1. Start backend:**
```bash
bash scripts/serve_api.sh
```

**2. Run Stage 5:**
```bash
export HEALTH_URL="http://127.0.0.1:8000/health"
export EXPECT_LIVE=0  # Advisory only
PYTHONPATH=. python stage5/run_stage5.py
```

**3. Open UAT Hub:**
```bash
# Navigate to:
http://localhost:5000/uat_hub.html
```

**4. Collect feedback:**
- Testers fill out forms
- Feedback saved to localStorage
- Multiple entries supported

**5. Export feedback:**
```bash
# When ready to review
python stage5/export_feedback.py
```

**6. Review results:**
```bash
cat qa/stage5/v0.5.0/summary.json | python -m json.tool
ls -la qa/stage5/feedback/
```

### Staging/Production UAT

**With health enforcement:**
```bash
export HEALTH_URL="https://staging.yourapp.com/health"
export EXPECT_LIVE=1  # Fail if unhealthy
PYTHONPATH=. python stage5/run_stage5.py
```

**Without health check:**
```bash
# Run without HEALTH_URL set
PYTHONPATH=. python stage5/run_stage5.py
```

## File Structure

```
stage5/
├── run_stage5.py            # Main orchestrator
├── export_feedback.py       # Export localStorage to files
└── README.md                # This file

public/
└── uat_hub.html             # Feedback capture page

qa/stage5/
├── v0.5.0/
│   ├── summary.json         # Machine-readable results
│   └── tests.txt            # Human-readable summary
├── feedback/
│   ├── entry_1_timestamp.json
│   ├── entry_2_timestamp.json
│   └── ...
└── feedback_local.json      # Optional: manual export from localStorage

scripts/
├── apply_stage5_gate_patch.py    # Release gate integration
└── update_test2_index_stage5.py  # Infrastructure tracking

ci/
└── stage5_gate.yml          # GitHub Actions workflow
```

## Results Format

### summary.json

```json
{
  "stage": "5",
  "version": "v0.5.0",
  "status": "PASS",
  "prereqs": {
    "ok": true,
    "msg": "All prerequisite artifacts present"
  },
  "health": {
    "enabled": true,
    "http_status": 200,
    "body": "{\"status\":\"ok\"}",
    "healthy": true
  },
  "state_snapshot": {},
  "uat_hub": {
    "count": 3
  }
}
```

### Feedback Entry

```json
{
  "ts": "2025-10-12T14:30:00.000Z",
  "tester": "JD",
  "feature": "Subscription",
  "flow": "SUB-BUY-PRO",
  "rating": 4,
  "notes": "Payment flow works well, but confirmation message was unclear."
}
```

## Pass Criteria

**Stage 5 passes when:**

1. ✅ **Prerequisites OK**: Bundles A/B/C artifacts exist
2. ✅ **Health OK**: If `HEALTH_URL` set and `EXPECT_LIVE=1`, health check passes

**Stage 5 is advisory for:**
- UAT feedback count (reported but doesn't fail gate)
- Health check when `EXPECT_LIVE=0` (warning only)

## Feedback Export

### Manual Export from Browser

**1. Export localStorage to file:**
```javascript
// In browser console
const data = localStorage.getItem('uat_feedback_entries');
console.log(data);
// Copy and save to qa/stage5/feedback_local.json
```

**2. Run export script:**
```bash
python stage5/export_feedback.py
```

### Automatic Export

The export script:
1. Reads `qa/stage5/feedback_local.json`
2. Parses JSON array
3. Creates individual files: `entry_N_timestamp.json`
4. Saves to `qa/stage5/feedback/`

## Release Gate Integration

### Apply Integration

```bash
python scripts/apply_stage5_gate_patch.py
```

**What it does:**
- Modifies `release_gate/run_all.py`
- Adds Stage 5 tail-runner after Stage 4
- Creates backup at `.bak_stage5_v050`
- Preserves existing functionality

### Run Complete Pipeline

```bash
# Start backend
bash scripts/serve_api.sh

# Run all gates (includes Stage 5)
PYTHONPATH=. python release_gate/run_all.py
```

**Execution flow:**
1. Packs 1-9 (Feature validation)
2. Bundle A (API security)
3. Bundle B (UI quality)
4. Bundle C (Governance)
5. Stage 4 (Production readiness)
6. **Stage 5 (Pilot & UAT)** ✨

## CI/CD Integration

### GitHub Actions

**Workflow:** `ci/stage5_gate.yml`

```yaml
name: Stage 5 – UAT Gate

on:
  workflow_dispatch:
    inputs:
      base_url:
        description: Base URL (optional)
        required: false
      health_url:
        description: Health URL (optional)
        required: false

jobs:
  stage5:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Run Stage 5
        env:
          HEALTH_URL: ${{ github.event.inputs.health_url }}
          EXPECT_LIVE: "1"
        run: python stage5/run_stage5.py || true
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: stage5-artifacts
          path: qa/stage5/v0.5.0/
```

**Usage:**
1. Manual trigger via workflow dispatch
2. Optional health URL input
3. Artifacts uploaded automatically

## Troubleshooting

### Prerequisites Failing

**Problem:** Missing Bundle A/B/C artifacts

**Solution:**
```bash
# Run bundles first
PYTHONPATH=. python bundle_a/tests_api/run_all.py
PYTHONPATH=. python bundle_b/tests_ui/run_all.py
PYTHONPATH=. python bundle_c/tests_api/run_all.py

# Then run Stage 5
PYTHONPATH=. python stage5/run_stage5.py
```

### Health Check Failing

**Problem:** Health endpoint returns non-ok

**Debug:**
```bash
# Test manually
curl -v $HEALTH_URL

# Run without enforcement
export EXPECT_LIVE=0
PYTHONPATH=. python stage5/run_stage5.py
```

### Feedback Not Exporting

**Problem:** No feedback_local.json file

**Solution:**
```bash
# Create manual export from browser:
# 1. Open browser console
# 2. Run: localStorage.getItem('uat_feedback_entries')
# 3. Copy output
# 4. Save to qa/stage5/feedback_local.json
# 5. Run export script
python stage5/export_feedback.py
```

### UAT Hub Not Loading

**Problem:** CSP blocking resources

**Check:**
- UAT hub has inline CSP header
- Only loads from 'self'
- No external dependencies

**Verify:**
```bash
curl -I http://localhost:5000/uat_hub.html
# Should see Content-Security-Policy header
```

## Best Practices

### UAT Planning

**Before UAT:**
1. Deploy to staging environment
2. Run Stages 1-4 to validate readiness
3. Share UAT hub URL with testers
4. Provide testing scenarios/flows

**During UAT:**
1. Monitor feedback submissions
2. Export feedback periodically
3. Triage critical issues immediately
4. Track coverage across features

**After UAT:**
1. Export all feedback
2. Analyze trends and patterns
3. Prioritize fixes
4. Document learnings

### Feedback Analysis

**Review Process:**
```bash
# Export all feedback
python stage5/export_feedback.py

# Review by rating
grep '"rating": [12]' qa/stage5/feedback/*.json

# Review by feature
grep '"feature": "Subscription"' qa/stage5/feedback/*.json

# Extract all notes
jq '.notes' qa/stage5/feedback/*.json
```

## Infrastructure Tracking

**Update test2.html:**
```bash
python scripts/update_test2_index_stage5.py
```

**Verify:**
```bash
grep -A 5 "UAT – Stage 5" public/test2.html
```

Creates new section with links to:
- UAT hub page (`/uat_hub.html`)
- Stage 5 code (`/stage5/run_stage5.py`)
- Test results (`/qa/stage5/v0.5.0/tests.txt`)

## Integration with Quality System

Stage 5 completes the **7-stage quality pipeline**:

1. **Packs 1-9**: Feature validation (Playwright E2E)
2. **Bundle A**: API security (CSRF, Stripe, Email)
3. **Bundle B**: UI quality (A11y, Perf, Responsive)
4. **Bundle C**: Governance (Org, Audit, Metrics)
5. **Stage 2**: File protection (SHA-256 guardrails)
6. **Stage 3**: Staging pilot (API smoke tests)
7. **Stage 4**: Production readiness (Health, Canary, CSP)
8. **Stage 5**: Pilot & UAT (Feedback, Prerequisites, Health) ✨

## Success Criteria

**Stage 5 is successful when:**

- [x] Prerequisites validated (Bundles A/B/C)
- [x] Health check passes (if enabled)
- [x] UAT hub accessible
- [x] Feedback capture working
- [x] Export process functional
- [x] Artifacts saved correctly

---

*Stage 5 Version: v0.5.0*  
*Status: Ready for UAT*
