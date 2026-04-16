# Stage 5 - Pilot & UAT Complete ✅

## Overview

Stage 5 is a **Pilot and User Acceptance Testing (UAT) quality gate** that facilitates real user testing with structured feedback capture. It validates prerequisites, optionally checks system health, and provides a web-based hub for collecting structured tester feedback.

## 🚀 What's Deployed

### UAT Feedback System

**1. UAT Hub Page (`/uat_hub.html`)**
- ✅ Standalone HTML feedback form
- ✅ Client-side localStorage storage
- ✅ CSP header security
- ✅ ARIA accessible
- ✅ Mobile responsive

**2. Feedback Fields**
- ✅ Tester name/initials
- ✅ Feature dropdown
- ✅ Flow identifier (e.g., SUB-BUY-PRO)
- ✅ Experience rating (1-5)
- ✅ Free-form notes

**3. Export & Storage**
- ✅ Export from localStorage to JSON files
- ✅ Individual entry files with timestamps
- ✅ Saved to `qa/stage5/feedback/`

### Validation Checks

**1. Prerequisite Validation**
- ✅ Checks Bundle A/B/C artifacts exist
- ✅ Ensures previous gates completed
- ✅ Reports prerequisite status

**2. Health Check (Optional)**
- ✅ Validates `/health` endpoint if `HEALTH_URL` set
- ✅ Requires healthy response if `EXPECT_LIVE=1`
- ✅ Advisory mode when `EXPECT_LIVE=0`

**3. UAT Feedback Tracking**
- ✅ Scans `qa/stage5/feedback/` directory
- ✅ Reports feedback entry count
- ✅ Includes in summary artifacts

## 📁 File Structure

```
stage5/
├── run_stage5.py            # Main orchestrator ✨
├── export_feedback.py       # Export localStorage to files ✨
└── README.md                # Comprehensive guide

public/
└── uat_hub.html             # Feedback capture page ✨

qa/stage5/
├── v0.5.0/
│   ├── summary.json         # Machine-readable results
│   └── tests.txt            # Human-readable summary
└── feedback/                # Individual feedback entries
    ├── entry_1_timestamp.json
    └── ...

scripts/
├── apply_stage5_gate_patch.py    # Release gate integration ✨
└── update_test2_index_stage5.py  # Infrastructure tracking ✨

ci/
└── stage5_gate.yml          # GitHub Actions workflow ✨

README_STAGE5.md             # Quick reference
STAGE5_COMPLETE.md           # This file
```

## 🔗 Release Gate Integration

**Stage 5 integrated into release gate!**

### Apply Integration

```bash
# Apply the patch
python scripts/apply_stage5_gate_patch.py

# Verify
grep "Stage 5" release_gate/run_all.py
```

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

## 🎯 How It Works

### UAT Hub Workflow

**For Testers:**
```
1. Open /uat_hub.html
2. Fill out feedback form:
   - Name/initials
   - Feature (dropdown)
   - Flow (e.g., SUB-BUY-PRO)
   - Rating (1-5)
   - Notes (bugs, UX, etc.)
3. Click "Save Feedback"
4. Confirmation shown
5. Feedback saved to localStorage
```

**For QA/Dev:**
```bash
# Export feedback to files
python stage5/export_feedback.py

# Review entries
ls -la qa/stage5/feedback/
cat qa/stage5/feedback/entry_*.json

# Analyze with jq
jq '.rating' qa/stage5/feedback/*.json
jq '.notes' qa/stage5/feedback/*.json
```

### Validation Flow

**1. Check Prerequisites:**
```python
# Validates artifacts exist:
- qa/bundle_a/v0.2.0/
- qa/bundle_b/v0.2.0/
- qa/bundle_c/v0.2.0/
```

**2. Health Check (Optional):**
```python
if HEALTH_URL:
    response = GET /health
    check_for_ok_status()
    if EXPECT_LIVE == "1" and not healthy:
        FAIL
```

**3. Scan Feedback:**
```python
feedback_count = len(glob("qa/stage5/feedback/*.json"))
report_in_summary()
```

## 🚀 Usage Guide

### Local UAT Testing

**1. Start environment:**
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
```
http://localhost:5000/uat_hub.html
```

**4. Collect feedback:**
- Testers submit feedback via form
- Stored in browser localStorage
- Export when ready for review

**5. Export & Review:**
```bash
python stage5/export_feedback.py
cat qa/stage5/feedback/*.json | jq .
```

### Staging UAT

```bash
export HEALTH_URL="https://staging.yourapp.com/health"
export EXPECT_LIVE=1  # Strict mode
PYTHONPATH=. python stage5/run_stage5.py
```

### Production UAT (Pilot)

```bash
export HEALTH_URL="https://yourapp.com/health"
export EXPECT_LIVE=1
PYTHONPATH=. python stage5/run_stage5.py
```

## 📊 Results Format

### summary.json (PASS Example)

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

## ✅ Pass Criteria

**Stage 5 passes when:**

1. ✅ **Prerequisites OK**: Bundle A/B/C artifacts exist
2. ✅ **Health OK**: If `HEALTH_URL` set and `EXPECT_LIVE=1`, health passes

**Stage 5 is advisory for:**
- UAT feedback count (reported but doesn't fail)
- Health check when `EXPECT_LIVE=0` (warning only)

## 🎯 Environment Variables

| Variable | Description | Default | UAT Mode |
|----------|-------------|---------|----------|
| `HEALTH_URL` | Health endpoint URL | - | Optional |
| `EXPECT_LIVE` | Require healthy backend | `0` | `1` for strict |

## 🎯 CI/CD Integration

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
```

**Usage:**
1. Go to Actions tab
2. Select "Stage 5 – UAT Gate"
3. Click "Run workflow"
4. Optionally provide URLs
5. Review uploaded artifacts

## 🐛 Troubleshooting

### Prerequisites Failing

**Problem:** Missing Bundle A/B/C artifacts

**Solution:**
```bash
# Run bundles first
PYTHONPATH=. python bundle_a/tests_api/run_all.py
PYTHONPATH=. python bundle_b/tests_ui/run_all.py
PYTHONPATH=. python bundle_c/tests_api/run_all.py

# Then Stage 5
PYTHONPATH=. python stage5/run_stage5.py
```

### Health Check Failing

**Debug:**
```bash
# Test health manually
curl -v $HEALTH_URL

# Run without enforcement
export EXPECT_LIVE=0
PYTHONPATH=. python stage5/run_stage5.py
```

### Feedback Export Issues

**Manual export from browser:**
```javascript
// In browser console:
const data = localStorage.getItem('uat_feedback_entries');
console.log(JSON.stringify(JSON.parse(data), null, 2));

// Copy output to qa/stage5/feedback_local.json
```

**Then run:**
```bash
python stage5/export_feedback.py
```

## 📈 Infrastructure Tracking

**Update test2.html:**
```bash
python scripts/update_test2_index_stage5.py
```

**Verify:**
```bash
grep -A 5 "UAT – Stage 5" public/test2.html
```

**Creates section with links to:**
- UAT hub page (`/uat_hub.html`)
- Stage 5 code (`/stage5/run_stage5.py`)
- Test results (`/qa/stage5/v0.5.0/tests.txt`)

## 🔄 Integration with Quality System

### Complete Quality Pipeline (7 Stages)

| Stage | Focus | Coverage | Status |
|-------|-------|----------|--------|
| **Packs 1-9** | Features | 45+ tests | ✅ READY |
| **Bundle A** | API Security | 7 tests | ✅ PASS |
| **Bundle B** | UI Quality | 28+ tests | ✅ PASS |
| **Bundle C** | Governance | 13+ tests | ✅ PASS |
| **Stage 2** | Guardrails | 13 files | ✅ PASS |
| **Stage 3** | Staging | 5 checks | ✅ READY |
| **Stage 4** | Go-Live | 4 checks | ✅ READY |
| **Stage 5** | UAT | 3 checks | ✅ READY |

**Total:** 120+ quality checks across 7 quality gates!

## 📚 Documentation

**Quick References:**
- `README_STAGE5.md` - Quick start guide

**Comprehensive:**
- `stage5/README.md` - Complete documentation
- `STAGE5_COMPLETE.md` - This file

**System Overview:**
- `QUALITY_GATES_COMPLETE.md` - All gates overview

## 🎉 Success Summary

**Stage 5 is UAT-ready!**

- ✅ UAT hub page with feedback capture
- ✅ localStorage persistence & export
- ✅ Prerequisite validation
- ✅ Optional health checking
- ✅ Release gate integration
- ✅ CI/CD workflow
- ✅ Infrastructure tracking
- ✅ Complete documentation

## 🚀 Best Practices

### UAT Planning

**Before UAT:**
1. Deploy to staging
2. Run Stages 1-4 for validation
3. Share `/uat_hub.html` with testers
4. Provide testing scenarios

**During UAT:**
1. Monitor feedback submissions
2. Export feedback periodically
3. Triage critical issues
4. Track feature coverage

**After UAT:**
1. Export all feedback
2. Analyze patterns
3. Prioritize fixes
4. Document learnings

### Feedback Analysis

```bash
# Export all
python stage5/export_feedback.py

# By rating (low scores)
grep '"rating": [12]' qa/stage5/feedback/*.json

# By feature
grep '"feature": "Subscription"' qa/stage5/feedback/*.json

# Extract notes
jq '.notes' qa/stage5/feedback/*.json
```

## 🎊 **Your UAT system is complete!**

**Stage 5 provides:**
1. ✅ **Structured Feedback** - UAT hub with form fields
2. ✅ **Privacy First** - Local storage, no offsite data
3. ✅ **Easy Export** - JSON files for analysis
4. ✅ **Prerequisite Checks** - Validates previous gates
5. ✅ **Health Validation** - Optional backend checks
6. ✅ **Complete Integration** - Part of release gate

**Facilitate real user testing with confidence!** 🎉

---

*Last Updated: 2025-10-12*  
*Stage 5 Version: v0.5.0*  
*Status: ✅ COMPLETE*
