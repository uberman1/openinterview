# Stage 5 – Pilot & UAT Pack v0.5.0

## Quick Start

Stage 5 transforms your test harness into a **Pilot/UAT facilitator** for real user acceptance testing with structured feedback capture.

### What it provides
- **UAT Hub Page** (`/uat_hub.html`) for capturing human tester feedback
- **Local Storage** - Feedback stored in browser localStorage, exported to `qa/stage5/feedback/*.json`
- **Health Gating** (optional) - Set `HEALTH_URL` and `EXPECT_LIVE=1` to require healthy backend
- **Prerequisite Validation** - Checks that Bundles A/B/C artifacts exist
- **Release Gate Integration** - Runs after Stage 4 in complete pipeline

## Quick Start (Replit/local)

**1. Run Stage 5:**
```bash
export HEALTH_URL="http://127.0.0.1:8000/health"
export EXPECT_LIVE=1
PYTHONPATH=. python stage5/run_stage5.py
```

**2. Open UAT Hub:**
```
Navigate to: /uat_hub.html
```

**3. Export feedback:**
```bash
# After testers submit feedback
python stage5/export_feedback.py
```

**4. Update infrastructure tracking:**
```bash
python scripts/update_test2_index_stage5.py
```

## Artifacts

Results saved to `qa/stage5/v0.5.0/`:
- `summary.json` – Machine-readable results
- `tests.txt` – Human-readable summary

Feedback saved to `qa/stage5/feedback/`:
- `entry_N_timestamp.json` – Individual feedback entries

## UAT Hub Usage

**For Testers:**
1. Open `/uat_hub.html` in browser
2. Fill out feedback form:
   - Tester name/initials
   - Feature tested
   - Flow (e.g., SUB-BUY-PRO)
   - Experience rating (1-5)
   - Notes (bugs, UX issues, etc.)
3. Click "Save Feedback"
4. Feedback stored locally in browser

**For QA/Dev:**
1. Export feedback to JSON files:
   ```bash
   python stage5/export_feedback.py
   ```
2. Review feedback in `qa/stage5/feedback/`
3. Triage and track issues

## Gate Integration

**Apply to release gate:**
```bash
python scripts/apply_stage5_gate_patch.py
```

**Run complete pipeline:**
```bash
# Includes Packs 1-9, Bundles A/B/C, Stage 4, Stage 5
PYTHONPATH=. python release_gate/run_all.py
```

## CI/CD Usage

See `ci/stage5_gate.yml` for GitHub Actions workflow.

**Trigger manually:**
1. Go to Actions tab
2. Select "Stage 5 – UAT Gate"
3. Click "Run workflow"
4. Optionally provide base_url and health_url
5. Review artifacts

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `HEALTH_URL` | Health endpoint URL | - | No |
| `EXPECT_LIVE` | Require healthy backend | `0` | No |

## File Locations

**Scripts:** `stage5/` directory
- `run_stage5.py` - Main orchestrator
- `export_feedback.py` - Export feedback to JSON files

**UAT Hub:** `public/`
- `uat_hub.html` - Feedback capture page

**Infrastructure:** `scripts/`
- `apply_stage5_gate_patch.py` - Gate integration
- `update_test2_index_stage5.py` - Add to test2.html

**CI/CD:** `ci/`
- `stage5_gate.yml` - GitHub Actions workflow

## Checks Performed

**1. Prerequisite Validation**
- Checks for Bundle A/B/C artifacts
- Ensures previous gates have run

**2. Health Check (Optional)**
- Validates `/health` endpoint if `HEALTH_URL` set
- Requires healthy response if `EXPECT_LIVE=1`
- Reports health status in artifacts

**3. UAT Feedback Scan**
- Counts feedback entries in `qa/stage5/feedback/`
- Reports in summary

## Status

Stage 5 passes when:
- ✅ Prerequisite artifacts exist (Bundles A/B/C)
- ✅ Health check passes (if enabled with EXPECT_LIVE=1)

## Next Steps

After Stage 5:
1. Review UAT feedback for critical issues
2. Triage and track bugs
3. Plan fixes or enhancements
4. Proceed to deployment when ready

See `stage5/README.md` for comprehensive documentation.
